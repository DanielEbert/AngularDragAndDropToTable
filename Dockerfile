# Use official Node.js LTS image
FROM node:22

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose Angular dev server port
EXPOSE 4200

# Default command (overridden by docker-compose)
CMD ["npm", "start"]
