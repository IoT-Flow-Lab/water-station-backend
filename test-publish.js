const mqtt = require('mqtt');

const brokerUrl = 'mqtt://broker.hivemq.com:1883';
const topic = 'weather_station/sci.pdn.ac.lk/e97d1b32/telemetry';

const client = mqtt.connect(brokerUrl);

const payload = {
  station_id: "WS-C3-E072A17299CC",
  timestamp: new Date().toISOString(),
  uptime_seconds: 42,
  boot_count: 3,
  sensors: {
    dht11: { status: "OK", temperature_c: 27.2, humidity_pct: 74.5 },
    bmp280: { status: "OK", temperature_c: 28.1, pressure_hpa: 1012.3 }
  }
};

client.on('connect', () => {
  console.log(`Connected to broker at ${brokerUrl}`);
  client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
    if (err) {
      console.error('Publish error:', err);
    } else {
      console.log(`Published payload to topic: ${topic}`);
    }
    client.end();
  });
});
