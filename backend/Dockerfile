FROM node:alpine

WORKDIR app/

COPY . .

RUN npm install

RUN npx prisma generate
RUN npx prisma --name "Production" migrate 



EXPOSE 5000

CMD ["node","index.js"]
