# Use Node.js 22 Alpine for a lightweight image
FROM node:22-alpine

# Install build dependencies for native modules (like bcrypt if needed)
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy the rest of the application code
COPY . .

# Expose the application port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the application
# Note: We use db:push or migrations in a real CI/CD pipeline, 
# but for the container start, we just run the server.
CMD ["npm", "start"]
