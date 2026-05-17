FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN SKIP_API_DURING_BUILD=1 npm run build

CMD ["npm", "run", "start"]
