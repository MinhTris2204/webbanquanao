from flask import Blueprint, jsonify, request
from models import db, Product, ProductView, Order, OrderDetail
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from sqlalchemy import func, desc, and_, text
from datetime import datetime, timedelta
import uuid
import numpy as np

recommendations_bp = Blueprint('recommendations', __name__)


def get_user_or_session():
    """Lay user_id neu da dang nhap, nguoc lai lay/tao session_id"""
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        if user_id:
            return {'user_id': user_id, 'session_id': None}
    except:
        pass

    session_id = request.cookies.get('session_id')
    if not session_id:
        session_id = str(uuid.uuid4())

    return {'user_id': None, 'session_id': session_id}


def cosine_similarity_np(vec_a, vec_b):
    """Tinh cosine similarity giua 2 vector numpy"""
    norm_a = np.linalg.norm(vec_a)
    norm_b = np.linalg.norm(vec_b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(vec_a, vec_b) / (norm_a * norm_b))


def get_embedding_similar_products(reference_product, exclude_ids=None, limit=8):
    """
    Deep Learning: Tim san pham tuong tu dua tren embedding vector (pgvector 384 chieu).
    Su dung cosine similarity de xep hang.
    Fallback ve content-based neu san pham khong co embedding.
    """
    if exclude_ids is None:
        exclude_ids = []

    ref_embedding = reference_product.embedding

    # Neu san pham co embedding, dung pgvector cosine distance
    if ref_embedding is not None:
        try:
            # pgvector: <=> la cosine distance (0 = giong nhat, 2 = khac nhat)
            # Lay nhieu hon de loc sau
            candidates = db.session.execute(
                text("""
                    SELECT products_id,
                           embedding <=> CAST(:emb AS vector) AS cos_dist
                    FROM products
                    WHERE trang_thai = 'Con_hang'
                      AND products_id != :pid
                      AND embedding IS NOT NULL
                    ORDER BY cos_dist ASC
                    LIMIT :lim
                """),
                {
                    'emb': str(list(ref_embedding)),
                    'pid': reference_product.products_id,
                    'lim': limit * 3
                }
            ).fetchall()

            candidate_ids = [row[0] for row in candidates if row[0] not in exclude_ids][:limit * 2]

            if candidate_ids:
                products = Product.query.filter(
                    Product.products_id.in_(candidate_ids),
                    Product.trang_thai == 'Con_hang'
                ).all()

                # Giu thu tu theo cosine distance
                id_order = {pid: i for i, pid in enumerate(candidate_ids)}
                products.sort(key=lambda p: id_order.get(p.products_id, 999))
                return products[:limit]
        except Exception as e:
            # pgvector co the chua duoc cai dat, fallback
            pass

    # Fallback: Content-based (cung loai + gioi tinh + gia tuong duong)
    price_min = float(reference_product.gia_ban) * 0.5
    price_max = float(reference_product.gia_ban) * 1.5

    query = Product.query.filter(
        Product.products_id != reference_product.products_id,
        Product.trang_thai == 'Con_hang',
        Product.loai == reference_product.loai
    )
    if exclude_ids:
        query = query.filter(Product.products_id.notin_(exclude_ids))

    products = query.order_by(
        db.case((Product.gioi_tinh == reference_product.gioi_tinh, 1), else_=0).desc(),
        db.case((Product.gia_ban.between(price_min, price_max), 1), else_=0).desc(),
        func.random()
    ).limit(limit).all()

    return products


def build_user_profile_embedding(viewed_product_ids):
    """
    Deep Learning: Tao user profile embedding bang cach lay trung binh
    cac embedding cua san pham da xem (mean pooling).
    """
    products = Product.query.filter(
        Product.products_id.in_(viewed_product_ids),
        Product.embedding.isnot(None)
    ).all()

    if not products:
        return None

    embeddings = [np.array(p.embedding) for p in products]
    return np.mean(embeddings, axis=0)


@recommendations_bp.route('/track-view', methods=['POST'])
def track_view():
    """Theo doi luot xem san pham cho thuat toan goi y"""
    try:
        data = request.json
        product_id = data.get('product_id')

        if not product_id:
            return jsonify({'error': 'product_id is required'}), 400

        product = Product.query.get(product_id)
        if not product:
            return jsonify({'error': 'Product not found'}), 404

        user_session = get_user_or_session()

        if user_session['user_id']:
            view = ProductView.query.filter_by(
                user_id=user_session['user_id'],
                product_id=product_id
            ).first()
        else:
            view = ProductView.query.filter_by(
                session_id=user_session['session_id'],
                product_id=product_id
            ).first()

        if view:
            view.view_count += 1
            view.last_viewed_at = datetime.utcnow()
        else:
            view = ProductView(
                user_id=user_session['user_id'],
                session_id=user_session['session_id'],
                product_id=product_id,
                view_count=1
            )
            db.session.add(view)

        db.session.commit()

        response = jsonify({'message': 'View tracked successfully'})
        if user_session['session_id']:
            response.set_cookie('session_id', user_session['session_id'], max_age=30 * 24 * 60 * 60)

        return response

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@recommendations_bp.route('/for-you', methods=['GET'])
def get_recommendations():
    """
    Goi y san pham ca nhan hoa.

    Thuat toan Deep Learning (Embedding-based):
    1. Lay lich su xem cua nguoi dung (10 san pham gan nhat)
    2. Tao user profile embedding = trung binh cac embedding san pham da xem
    3. Tim san pham chua xem co embedding gan nhat voi profile (cosine similarity)
    4. Fallback ve content-based neu khong co embedding
    5. Bo sung tu trending neu chua du so luong
    """
    try:
        limit = request.args.get('limit', 8, type=int)
        user_session = get_user_or_session()

        # Lay lich su xem (10 san pham gan nhat)
        if user_session['user_id']:
            viewed_products = db.session.query(ProductView.product_id).filter(
                ProductView.user_id == user_session['user_id']
            ).order_by(desc(ProductView.last_viewed_at)).limit(10).all()
        else:
            viewed_products = db.session.query(ProductView.product_id).filter(
                ProductView.session_id == user_session['session_id']
            ).order_by(desc(ProductView.last_viewed_at)).limit(10).all()

        viewed_product_ids = [p[0] for p in viewed_products]

        if not viewed_product_ids:
            return jsonify({'products': [], 'based_on': 'no_data'})

        # --- Deep Learning: Embedding-based personalization ---
        user_embedding = build_user_profile_embedding(viewed_product_ids)

        if user_embedding is not None:
            try:
                # Tim san pham chua xem co embedding gan nhat voi user profile
                candidates = db.session.execute(
                    text("""
                        SELECT products_id,
                               embedding <=> CAST(:emb AS vector) AS cos_dist
                        FROM products
                        WHERE trang_thai = 'Con_hang'
                          AND embedding IS NOT NULL
                        ORDER BY cos_dist ASC
                        LIMIT :lim
                    """),
                    {
                        'emb': str(user_embedding.tolist()),
                        'lim': limit * 4
                    }
                ).fetchall()

                # Loc san pham da xem
                candidate_ids = [
                    row[0] for row in candidates
                    if row[0] not in viewed_product_ids
                ][:limit * 2]

                if candidate_ids:
                    products = Product.query.filter(
                        Product.products_id.in_(candidate_ids),
                        Product.trang_thai == 'Con_hang'
                    ).all()

                    id_order = {pid: i for i, pid in enumerate(candidate_ids)}
                    products.sort(key=lambda p: id_order.get(p.products_id, 999))
                    recommendations = products[:limit]

                    # Bo sung tu trending neu chua du
                    if len(recommendations) < limit:
                        remaining = limit - len(recommendations)
                        exclude = [p.products_id for p in recommendations] + viewed_product_ids
                        trending = get_trending_products_query(remaining, exclude_ids=exclude)
                        recommendations.extend(trending)

                    return jsonify({
                        'products': [p.to_dict() for p in recommendations],
                        'based_on': 'deep_learning'
                    })
            except Exception:
                pass  # Fallback xuong content-based

        # --- Fallback: Content-based filtering ---
        viewed_product_details = Product.query.filter(
            Product.products_id.in_(viewed_product_ids)
        ).all()

        categories = list(set([p.loai for p in viewed_product_details if p.loai]))
        genders = list(set([p.gioi_tinh for p in viewed_product_details if p.gioi_tinh]))

        view_count_subquery = db.session.query(
            ProductView.product_id,
            func.sum(ProductView.view_count).label('total_views')
        ).group_by(ProductView.product_id).subquery()

        recommendations_query = Product.query.filter(
            Product.trang_thai == 'Con_hang',
            Product.products_id.notin_(viewed_product_ids)
        )

        if categories or genders:
            recommendations_query = recommendations_query.filter(
                db.or_(
                    Product.loai.in_(categories) if categories else False,
                    Product.gioi_tinh.in_(genders) if genders else False
                )
            )

        recommendations_query = recommendations_query.outerjoin(
            view_count_subquery,
            Product.products_id == view_count_subquery.c.product_id
        ).order_by(
            desc(view_count_subquery.c.total_views),
            desc(Product.created_at)
        )

        recommendations = recommendations_query.limit(limit).all()

        if len(recommendations) < limit:
            remaining = limit - len(recommendations)
            exclude = [p.products_id for p in recommendations] + viewed_product_ids
            trending = get_trending_products_query(remaining, exclude_ids=exclude)
            recommendations.extend(trending)

        return jsonify({
            'products': [p.to_dict() for p in recommendations],
            'based_on': 'user_behavior'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@recommendations_bp.route('/similar/<int:product_id>', methods=['GET'])
def get_similar_products(product_id):
    """
    Tim san pham tuong tu dua tren Deep Learning (embedding cosine similarity).
    Fallback ve content-based neu khong co embedding.
    """
    try:
        limit = request.args.get('limit', 8, type=int)

        product = Product.query.get(product_id)
        if not product:
            return jsonify({'error': 'Product not found'}), 404

        similar = get_embedding_similar_products(product, exclude_ids=[product_id], limit=limit)

        return jsonify({
            'products': [p.to_dict() for p in similar],
            'reference_product': product.to_dict(),
            'method': 'embedding' if product.embedding is not None else 'content_based'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@recommendations_bp.route('/trending', methods=['GET'])
def get_trending():
    """Lay danh sach san pham dang thinh hanh"""
    try:
        limit = request.args.get('limit', 8, type=int)
        return get_trending_products(limit)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def get_trending_products(limit=8):
    """Helper function de lay san pham trending"""
    products = get_trending_products_query(limit)
    return jsonify({
        'products': [p.to_dict() for p in products],
        'based_on': 'trending'
    })


def get_trending_products_query(limit=8, exclude_ids=None):
    """
    Helper: Lay san pham trending dua tren luot xem 30 ngay gan nhat.
    """
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)

    trending_subquery = db.session.query(
        ProductView.product_id,
        func.sum(ProductView.view_count).label('total_views')
    ).filter(
        ProductView.last_viewed_at >= thirty_days_ago
    ).group_by(ProductView.product_id).subquery()

    query = Product.query.filter(Product.trang_thai == 'Con_hang')

    if exclude_ids:
        query = query.filter(Product.products_id.notin_(exclude_ids))

    products = query.outerjoin(
        trending_subquery,
        Product.products_id == trending_subquery.c.product_id
    ).order_by(
        desc(trending_subquery.c.total_views),
        desc(Product.created_at)
    ).limit(limit).all()

    return products
