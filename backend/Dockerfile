# Usa un’immagine leggera di Node.js
FROM node:18-alpine

# Crea e fissa la cartella di lavoro
WORKDIR /app

# Copia package.json e package-lock.json per sfruttare la cache sui RUN npm install
COPY package*.json ./

# Installa le dipendenze
RUN npm install

# Copia tutto il resto del codice
COPY . .

# Esponi la porta su cui gira il tuo server
EXPOSE 3000

# Comando di avvio
CMD ["npm", "start"]
