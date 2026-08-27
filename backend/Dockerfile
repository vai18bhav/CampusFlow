# Use official Node.js 20 LTS lightweight alpine image
FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Copy package manifests first for efficient caching
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy remaining backend source code
COPY . .

# Expose backend API port
EXPOSE 5000

# Set environment variable defaults
ENV PORT=5000
ENV NODE_ENV=production

# Start application server
CMD ["node", "server.js"]
