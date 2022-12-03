<div align="center">
  <h2 align="center"> Agro Insurance Oracle *Experimental*</h2>

  <p align="center">
    An MVP Oracle that gets the Weather Report By City
    <a href="https://docs.minaprotocol.com/">using Mina Protocol</a>
  </p>
</div>

<!-- ABOUT THE PROJECT -->
## About The Project

This is an MVP Oracle to get the weather from different cities, the main idea is check some temperature data and if the temperature is higher or lower than the register by the insurance policy then make a payment for the insured amount to the client.

Why use Mina Protocol?

* Is Easy because is JS.
* You don't need difficult steps or black boxes, just make a request to your api.
* You don't need reveal tha from the user.
* Is trustless and simple.
* It is Fast.

<!-- GETTING STARTED -->
## Getting Started

To interact with the oracle you need follow some steps.  

Clone this repo, instal dependencies run the following command:

```sh
npm i
```

Or with `yarn`:

```sh
yarn add
```

You can generate a Mina-compatible public/private key pair for your oracle by running `npm run keygen`  

### Example Key Pair

```js
{
  privateKey: 'EKEp78Y65RRtxiJMpMy7wuuECzeMPiFFFaY8z7Mkxe5Kwu3hpAEQ',
  publicKey: 'B62qqPmfsDQA8uechrADbELDwVoqKM7bhE27CjZSf4USz19V1X1aJNd'
}
```

Get an API_KEY from [OpenWeather](https://openweathermap.org/current)  

Run the project in localhost with:

```sh
  npm run dev
```

### API Call

```sh
localhost:8080/weather/:city_name

ex: localhost:8080/weather/London
```

### API Response

The oracle returns its response in JSON with three, top-level properties: `data`, `signature`, & `publicKey`.  

* `data` is an object of the information we are interested in and can have any form.
* `signature` is a signature for the data created using the oracle operator’s private key. Smart contracts will use this to verify that data was provided by the expected source.
* `publicKey` is the public key of the oracle. This will be the same for all requests to this oracle.

```json
{
 "data": {
  "id": 804,
  "weather": "Clouds",
  "temp": 42.08
 },
 "signature": {
  "r": "2828138012224678124927666830892085288980478540898457619344305184132504440023",
  "s": "22330228077716101209387867776169161958014086471857006140799099300191475928872"
 },
 "publicKey": "B62qqPmfsDQA8uechrADbELDwVoqKM7bhE27CjZSf4USz19V1X1aJNd"
}
```

## Using the Oracle

As a first step create your smart contract [here yo can find more info](https://docs.minaprotocol.com/zkapps/tutorials/oracle)  

In your contract file you need to usee the public key from the Oracle

```js
import {
  Field,
  SmartContract,
  state,
  State,
  method,
  DeployArgs,
  Permissions,
  PublicKey,
  Signature,
  PrivateKey,
} from 'snarkyjs';

// The public key of our trusted data provider
// the public key should be the same as the keygen generate
const ORACLE_PUBLIC_KEY =
  'B62qqPmfsDQA8uechrADbELDwVoqKM7bhE27CjZSf4USz19V1X1aJNd';
```

We will use the `init` method to initialize `oraclePublicKey` to the weather oracle's public key.

```js
@method init(zkappKey: PrivateKey) {
    super.init(zkappKey);
    // Initialize contract state
    this.oraclePublicKey.set(PublicKey.fromBase58(ORACLE_PUBLIC_KEY));
    // Specify that caller should include signature with tx instead of proof
    this.requireSignature();
  }
```

`init` is a method that the contract developer can run after the contract is deployed, but before users have the chance to interact with it, to set the initial on-chain state and other configuration. You can think of it like a constructor in a Solidity contract.

## Emitting Events

Events allow smart contracts to publish arbitrary messages that anybody can verify without requiring that we store them in the state of a zkApp account. This property makes them ideal for communication with other parts of your application that don’t live on-chain (like your UI, or even an external service).  

Let’s add an events object to our Smart Contract class to define the names and types of the events it will emit.

```js
// Define contract events
events = {
  verified: Field,
};
```

Now, let’s add a method to verify the weather is lower than 60 Fahrenheit degrees.  

This is defined the same as any other TypeScript method, except that it must have the @method decorator in front of it, which tells SnarkyJS that this method can be invoked by users when they interact with the smart contract.

```js
@method verify(id: Field, temp: Field) {
}
```

We will pass the id, is the length of the city_name string and the temperature expected  

The `verify()` method will not return any values or change any contract state, instead it will emit an id event with the city_name id if their temperature is lower than 60.

## Fetching the Oracle’s Public Key

Now let’s get the oracle’s public key from the on-chain state. We will need this to verify the signature of data from the oracle.

```js

@method verify(id: Field, temp: Field) {
  // Get the oracle public key from the contract state
const oraclePublicKey = this.oraclePublicKey.get();
this.oraclePublicKey.assertEquals(oraclePublicKey);
}

```

We use assertEquals() to ensure that the public key we retrieved at execution time is the same as the public key that exists within the zkApp account on the Mina network when the transaction is processed by the network.

## Verify the Signature

```js

@method verify(id: Field, temp: Field) {
  // Get the oracle public key from the contract state
const oraclePublicKey = this.oraclePublicKey.get();
this.oraclePublicKey.assertEquals(oraclePublicKey);

// Evaluate whether the signature is valid for the provided data
const validSignature = signature.verify(oraclePublicKey, [id, temp]);

}

```

We also want it to make it impossible to generate a valid zero-knowledge proof if `validSignature` is false. We can do this with `assertTrue()`. If the signature is invalid, this will throw an exception and make it impossible to generate a valid ZKP and transaction.

```js

@method verify(id: Field, temp: Field) {
  // Get the oracle public key from the contract state
const oraclePublicKey = this.oraclePublicKey.get();
this.oraclePublicKey.assertEquals(oraclePublicKey);

// Evaluate whether the signature is valid for the provided data
const validSignature = signature.verify(oraclePublicKey, [id, temp]);

// Check that the signature is valid
validSignature.assertTrue();
}

```

## Check that the city temperature is lower than 60

We want our verify() method to only emit an event if the city temperature is lower than 60. We can ensure that this condition is met by calling the `assertLt()`.

```js

@method verify(id: Field, temp: Field) {
  // Get the oracle public key from the contract state
const oraclePublicKey = this.oraclePublicKey.get();
this.oraclePublicKey.assertEquals(oraclePublicKey);

// Evaluate whether the signature is valid for the provided data
const validSignature = signature.verify(oraclePublicKey, [id, temp]);

// Check that the signature is valid
validSignature.assertTrue();

temp.assertLt(Field(60));

}

```

These assert methods create a constraint that makes it impossible for users to generate a valid zero-knowledge proof unless their condition is met. Without a valid zero-knowledge proof (or a signature) it’s impossible to generate a valid Mina transaction. So, we can now rest assured that users can only call our smart contract method and send a valid transaction if they have a valid signature from our expected oracle and a temperature lower than 60.

## Emitting our verified Event

Now that we are sure everything checks out, we can emit an event to indicate this. The first argument to emitEvent() is an arbitrary string name chosen by the developer (because a smart contract could emit more than one type of event) and the second argument can be any value, as long as it matches the type defined for our event earlier. In this case, our event is Field, but it could be a more complicated type built on Fields, if the situation called for it. Emitted events are stored and available on archive nodes in the Mina network.

```js

@method verify(id: Field, temp: Field) {
  // Get the oracle public key from the contract state
const oraclePublicKey = this.oraclePublicKey.get();
this.oraclePublicKey.assertEquals(oraclePublicKey);

// Evaluate whether the signature is valid for the provided data
const validSignature = signature.verify(oraclePublicKey, [id, temp]);

// Check that the signature is valid
validSignature.assertTrue();

temp.assertLt(Field(60));

// Emit an event containing the verified users id
this.emitEvent('verified', id);
}

```
