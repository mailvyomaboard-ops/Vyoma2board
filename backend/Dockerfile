FROM node:20-bookworm

# Install required compilers and libreoffice for PPT to PDF
RUN apt-get update && apt-get install -y \
    gcc \
    python3 \
    default-jdk \
    libreoffice \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy backend source
COPY . .

# Expose port
EXPOSE 3002

# Start server
CMD ["npm", "start"]
