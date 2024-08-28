# Use Node.js as the base image
FROM node:20-slim

ARG var_name

# Set the working directory in the Docker image
WORKDIR /app

ENV NPMRC=$var_name

RUN echo $NPMRC > .npmrc

# Copy your package files
COPY package.json ./

# Install any dependencies
RUN npm install --omit=dev

# Copy your source files
COPY ./src/* ./

# Command to publish your package
CMD ["npm", "publish"]
