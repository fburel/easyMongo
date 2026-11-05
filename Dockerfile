# Use Node.js as the base image
FROM node:20-slim

# Set the working directory in the Docker image
WORKDIR /app

# Copy your package files
COPY package.json readme.md ./

# Agent skill, so that it can be copied from node_modules
COPY claude-plugin/skills ./skills

# Copy your source files
COPY ./src/* ./

# Publish the package.
# The npm credentials are NOT baked into the image: ~/.npmrc is mounted
# read-only at run time (see the "deploy" script in package.json).
CMD ["npm", "publish"]
