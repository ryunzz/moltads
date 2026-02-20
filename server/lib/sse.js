const clients = new Set();

const addClient = (res) => {
  clients.add(res);

  return () => {
    clients.delete(res);
  };
};

const broadcast = (event) => {
  const payload = `data: ${JSON.stringify(event)}\n\n`;

  for (const client of clients) {
    try {
      client.write(payload);
    } catch (error) {
      clients.delete(client);
    }
  }
};

const activeClientCount = () => clients.size;

module.exports = {
  addClient,
  broadcast,
  activeClientCount,
};
