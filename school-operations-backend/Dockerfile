FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install

# Copy application code and SQL schema
COPY src ./src
COPY sql ./sql
COPY .env.example .env

# Expose port
EXPOSE 5001

# Start the application
CMD ["pnpm", "start"]
