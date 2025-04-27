import amqp from "amqplib";

let channel;
let connection;

// Connect to RabbitMQ


const connectRabbitMQ = async () => {
  try {
    const rabbitMQUrl = process.env.RABBITMQ_URL; // Example: 'amqp://localhost'
    if (!rabbitMQUrl) {
      throw new Error("RABBITMQ_URL not found in environment variables");
    }

    connection = await amqp.connect(rabbitMQUrl);
    channel = await connection.createChannel();

    console.log("✅ Connected to RabbitMQ");
  } catch (error) {
    console.error("❌ RabbitMQ connection failed:", error);
    process.exit(1); // Exit if connection fails
  }
};

// Publish message to a queue
const publishToQueue = async (queueName, message) => {
  if (!channel) {
    await connectRabbitMQ();
  }

  await channel.assertQueue(queueName, { durable: true });
  channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)));
};

// Subscribe to a queue
const subscribeToQueue = async (queueName, callback) => {
  if (!channel) {
    await connectRabbitMQ();
  }

  await channel.assertQueue(queueName, { durable: true });

  channel.consume(queueName, (msg) => {
    if (msg !== null) {
      const content = JSON.parse(msg.content.toString());
      callback(content); // Handle message
      channel.ack(msg); // Acknowledge after processing
    }
  });
};

export { 
    publishToQueue, 
    subscribeToQueue,
    connectRabbitMQ 
};
