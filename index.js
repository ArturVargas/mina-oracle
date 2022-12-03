const express = require("express");
require("dotenv").config();
const app = express();
const {
  isReady,
  PrivateKey,
  Field,
  Signature,
  CircuitString,
} = require("snarkyjs");
const axios = require("axios");

const PORT = process.env.PORT || 8080;

async function getGeocoding(city_name) {
  try {
    const data = await axios.get(
      `http://api.openweathermap.org/geo/1.0/direct?q=${city_name}&limit=5&appid=${process.env.OPW_API_KEY}`
    );

    const result = data ? data.data[0] : null;
    return { name: result?.name, lat: result?.lat, lon: result?.lon };
  } catch (error) {
    console.log("ERROR!! ", error);
  }
}

async function getCurrentWeather(city_name) {
  try {
    const result = await getGeocoding(city_name);

    const data = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${result.lat}&lon=${result.lon}&appid=${process.env.OPW_API_KEY}&units=imperial`
    );

    const response = data ? data.data : null;
    return {
      id: response?.weather[0].id,
      weather: response?.weather[0].main,
      temp: response?.main.temp, // Fahrenheit
    };
  } catch (error) {
    console.log("ERROR!! ", error);
  }
}

async function getSignedData(city_name) {
  try {
    // Load SnarkyJS
    await isReady;

    const privateKey = PrivateKey.fromBase58(process.env.PRIVATE_KEY);

    // Get the weather data from API
    const getWeatherData = await getCurrentWeather(city_name);

    // We compute the public key associated with our private key
    const publicKey = privateKey.toPublicKey();

    const id = Field(city_name.length);
    const temperature = Field(Math.round(getWeatherData.temp));

    // Use our private key to sign an array of Fields containing the weather id and
    // temperature
    const signature = Signature.create(privateKey, [id, temperature]);

    return {
      data: { ...getWeatherData },
      signature,
      publicKey,
    };
  } catch (error) {
    console.log("ERROR!! ", error);
    return error;
  }
}

app.get("/weather/:city_name", async (req, res) => {
  const { city_name } = req.params;

  const data = await getSignedData(city_name);
  res.send(data);
});

app.listen(PORT, () => {
  console.log(`Server Running on Port: ${PORT}`);
});
