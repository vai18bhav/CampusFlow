# Use official Node.js lightweight Alpine image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first for cached dependency layer
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application source code
COPY . .

# Expose default Cloud Run port (Cloud Run sets PORT env variable, defaults to 8080 or 5000)
ENV PORT=8080
EXPOSE 8080

# Start Express server
CMD ["node", "server.js"]
