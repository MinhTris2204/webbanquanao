FROM node:20-alpine

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

COPY package*.json ./

# Clean install to get correct native binaries for Alpine Linux
RUN rm -rf node_modules package-lock.json && npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
