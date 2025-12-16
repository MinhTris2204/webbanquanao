from app import create_app
from models import db, Product

app = create_app()
with app.app_context():
    # Check products with embeddings
    result = db.session.execute(db.text('SELECT COUNT(*) FROM products WHERE embedding IS NOT NULL')).scalar()
    print(f'Products with embeddings: {result}')
    
    # Check total products
    total = db.session.execute(db.text('SELECT COUNT(*) FROM products')).scalar()
    print(f'Total products: {total}')
    
    # Test embedding search
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer('all-MiniLM-L6-v2')
    query = 'tìm mua áo'
    emb = model.encode(query).tolist()
    emb_str = '[' + ','.join(map(str, emb)) + ']'
    
    results = db.session.execute(
        db.text('''
            SELECT products_id, ten_san_pham, gia_ban
            FROM products
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> :embedding::vector
            LIMIT 3
        '''),
        {'embedding': emb_str}
    ).fetchall()
    
    print(f'Search results for "{query}":')
    for r in results:
        print(f'  - {r.ten_san_pham}: {r.gia_ban}')
