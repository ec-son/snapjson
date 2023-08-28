# snapjson

> **snapjson** is a lightweight NoSQL object-relational mapping (ORM) library for Node.js, written in TypeScript. It allows you to store data in JSON files, with each collection represented as an array of documents.

## Table of Contents

- [Installation](#installation)
- [Getting Started](#getting-started)
  - [Importing of `SnapJson` class](#importing-the-snapjson-class)
  - [ Creating an instance of `SnapJson`](#creating-an-instance-of-snapjson)
  - [Defining the data schema](#defining-the-data-schema)
  - [Creating a collection](#creating-a-collection)
  - [Removing a collection](#removing-a-collection)
  - [Query Methods](#query-methods)
    - [Inserting documents](#inserting-documents)
    - [Finding documents](#finding-documents)
    - [Updating documents](#updating-documents)
    - [Deleting documents](#deleting-documents)
  - [Document methods](#document-methods)
  - [Additional methods](#additional-methods)
    - [SnapJson class](#snapjson-class)
    - [Collection class](#collection-class)
- [Operators](#operators)
  - [Comparison Operators](#comparison-operators)
    - [$eq Operator](#eq-operator)
    - [$ne Operator](#ne-operator)
    - [$gt Operator](#gt-operator)
    - [$lt Operator](#lt-operator)
    - [$gte Operator](#gte-operator)
    - [$lte Operator](#lte-operator)
    - [$in Operator](#in-operator)
    - [$nin Operator](#nin-operator)
  - [Logical Operators](#logical-operators)
    - [$and Operator](#and-operator)
    - [$or Operator](#or-operator)
  - [Array Operators](#array-operators)
    - [Basic query](#basic-query)
    - [$eq and $ne operators](#eq-and-ne-operators)
    - [$contains operator](#contains-operator)
    - [$nocontains operator](#nocontains-operator)
- [Working with Regular Expressions](#working-with-regular-expressions)
- [Reporting Issues](#reporting-issues)
- [License](#license)

## Installation

```bash
npm install snapjson
```

## Getting Started

To use the snapjson module, follow these simple steps:

### Importing the `SnapJson` class

```typescript
import { SnapJson, createCollection } from "snapjson";
```

### Creating an instance of `SnapJson`

```typescript
const path = ""; // path of JSON file
const orm = new SnapJson(path);
```

### Defining the data schema

Define your data schema using TypeScript interfaces (the `__id` property will be added automatically for the primary key):

```typescript
interface UserSchema {
  name: string;
  email: string;
  password: string;
  age?: number;
}
```

### Creating a collection

```typescript
// Option 1: Simple collection creation
const collection = await orm.createCollection("user"); // It returns the collection name when it is created.
console.log(collection); // user

// Option 2: Creating multiple collections at once
const collections = await orm.createCollections(["user", "teacher"]);
console.log(collections); // [ 'user', 'teacher' ]

// Option 3: Creating collection with unique key
const collection = await orm.createCollection({
  collectionName: "user",
  uniqueKeys: ["email"], // This defines all properties that will be unique.
});
```

Alternatively, you can use a shortcut helper function:

```typescript
// Instead of orm.createCollection and orm.createCollections, you can use: createCollection function, imported from snapjson.
// createCollection<T>(collection: string | { collectionName: string; uniqueKeys?: Array<keyof T>; }, path?: string, force?: boolean), default path is db/db.json
const collection = await createCollection("user");
const collections = await createCollection(["user", "teacher"]);
```

### Removing a collection

```typescript
const collection = await orm.removeCollection("user");
console.log(collection); // user
const collections = await orm.removeCollection(["teacher", "student"]);
console.log(collections); // [ 'teacher', 'student' ]

// Or
// removeCollection(collections: string | string[], path?: string, force?: boolean), default path is db/db.json
await removeCollection("user");
await removeCollection(["teacher", "student"]);
```

### Query Methods

Use collection methods for querying:

#### Inserting documents

```typescript
const usersCollection = await orm.collection<UserSchema>("user");

// Or

const usersCollection = await defineCollection<UserSchema>("user");

// Inserting one document
const alice = await usersCollection.insertOne({
  email: "alice@example.com",
  name: "Alice",
  password: "!13x47dh32",
  age: 25,
});

console.log(alice.toObject());

/*
  {
    email: 'alice@example.com',
    name: 'Alice',
    password: '!13x47dh32',
    age: 25,
    __id: 1
  }
*/

// Inserting multiple documents at once
const users = await usersCollection.insertMany([
  {
    email: "carole@example.com",
    name: "Carole",
    password: "!13x9dnsnv",
    age: 22,
  },
  {
    email: "mary@example.com",
    name: "Mary",
    password: "xnjsd7432&8",
    age: 20,
  },
]);

users.forEach((user) => {
  console.log(user.toObject());
});

/*
  {
    email: 'carole@example.com',
    name: 'Carole',
    password: '!13x9dnsnv',
    age: 22,
    __id: 2
  }
  {
    email: 'mary@example.com',
    name: 'Mary',
    password: 'xnjsd7432&8',
    age: 20,
    __id: 3
  }
*/
```

#### Finding documents

```typescript
// Finding one document
const carole = await usersCollection.findOne(
  { name: "Carole" },
  { select: ["__id", "age", "email", "name"] }
);
if (carole) console.log(carole.toObject());

/*
  {
    email: 'carole@example.com',
    name: 'Carole',
    age: 22,
    __id: 2
  }
*/

// Finding documents
const users = await usersCollection.find(
  { age: { $gte: 20 } },
  { select: ["__id", "age", "email", "name"], limit: 3 }
);
users.forEach((user) => {
  console.log(user.toObject());
});

/*
  { __id: 1, age: 25, email: 'alice@example.com', name: 'Alice' }
  { __id: 2, age: 22, email: 'carole@example.com', name: 'Carole' }
  { __id: 3, age: 20, email: 'mary@example.com', name: 'Mary' }
*/
```

#### Updating documents

```typescript
/*
  Before updating:

  {
    email: 'mary@example.com',
    name: 'Mary',
    password: 'xnjsd7432&8',
    age: 20,
    __id: 3
  }
*/
const data = { age: 21 };
const user = await usersCollection.updateOne(data, { __id: 3 });
if (user) console.log(user.toObject());

/*
  After updating:

  {
    email: 'mary@example.com',
    name: 'Mary',
    password: 'xnjsd7432&8',
    age: 21, ✔
    __id: 3
  }
*/
```

#### Deleting documents

```typescript
const user = await usersCollection.deleteOne({ __id: 3 });
if (user) console.log(user.toObject());

/*
  {
    email: 'mary@example.com',
    name: 'Mary',
    password: 'xnjsd7432&8',
    age: 21,
    __id: 3
  }
*/
```

### Document methods

```typescript
const user = await usersCollection.findById(1);

if (user) {
  console.log(user.toObject()); // Convert document into a plain object.
  console.log(user.toJSON()); // Convert document into JSON.
  user.age = 10;
  await user.save(); // Save the changes to the document
  await user.delete(); // Delete the document from the collection
}
```

### Additional methods

#### SnapJson class

```typescript
/*
  - getCollections
  - isExistCollection
  - size
  - pathDB
*/

const collections = await orm.getCollections(); // Returns all collection names available in the database.
console.log(collections); // [ 'user' ]

const isExists = await orm.isExistCollection("user"); // Returns true if the collection exists in the database, otherwise returns false.
console.log(isExists); // true

const databaseSize = await orm.size(); // Returns the size of the database file.
console.log(databaseSize); // 58 KB

console.log(orm.pathDB); // db/db.json
```

#### Collection class

```typescript
/*
  - addUniqueKey
  - getUniqueKeys
  - removeUniqueKey
  - removeUniqueKey
  - removeAllUniqueKeys
  - count
  - size
  - lastIdInsert
  - add
  - create
*/

// addUniqueKey
const key = await usersCollection.addUniqueKey("email");
console.log(key); // email

const keys = await usersCollection.addUniqueKey(["email", "name"]);
console.log(key); // [ 'email', 'name' ]

// getUniqueKeys
const keys = await usersCollection.getUniqueKeys();
console.log(keys); // [ 'email', 'name' ]

// removeUniqueKey
const keys = await usersCollection.removeUniqueKey("name");
console.log(keys); // name

// removeAllUniqueKeys
const keys = await usersCollection.removeAllUniqueKeys();
console.log(keys); // [ 'email', 'name' ]

// count
const ct = await usersCollection.count();
console.log(ct); // 3
// Or
await usersCollection.count({ age: { $lte: 30 } });

// size
const collectionSize = await usersCollection.size();
console.log(collectionSize); // 26 KB

// lastIdInsert
const id = await usersCollection.lastIdInsert();
console.log(id); // 3

// add and create methods are aliases for insertOne method
```

## Operators

Operators are special symbols or keywords that allow you to carry out mathematical or logical operations. snapjson provides a large number of operators to help you build complex queries.

snapjson offers the following query operator types:

- Comparison
- Logical
- Array

## Comparison Operators

snapjson comparison operators can be used to compare values in a document. The following table contains the common comparison operators.

| Operators | Description                                                     |
| --------- | --------------------------------------------------------------- |
| $eq       | Matches values that are equal to the given value.               |
| $ne       | Matches values that are not equal to the given value.           |
| $gt       | Matches if values are greater than the given value.             |
| $gte      | Matches if values are greater than or equal to the given value. |
| $lt       | Matches if values are less than the given value.                |
| $lte      | Matches if values are less than or equal to the given value.    |
| $in       | Matches any of the values in an array.                          |
| $nin      | Matches none of the values specified in an array.               |

### $eq Operator

In this example, we retrieve the document with the exact id value 2.

```typescript
const user = await usersCollection.findOne({ __id: { $eq: 2 } });
if (user) console.log(user.toObject());

/*
  {
    email: 'carole@example.com',
    name: 'Carole',
    password: '!13x9dnsnv',
    age: 22,
    __id: 2
}
```

### $ne Operator

Suppose we have a collection of students, and we need to find all documents whose age field is not equal to 40:

```typescript
await studentsCollection.find({ age: { $ne: 40 } }))

/*
  [
    {
      __id: 1,
      name: "Gonzalez Estrada",
      gender: "male",
      age: 39,
      email: "gonzalezestrada@manglo.com",
    },
    {
      __id: 2,
      name: "Burris Leon",
      gender: "male",
      age: 37,
      email: "burrisleon@manglo.com",
    },
    {
      __id: 3,
      name: "Maryanne Wagner",
      gender: "female",
      age: 32,
      email: "maryannewagner@manglo.com",
    },
  ];
*/
```

### $gt Operator

In this example, we retrieve the documents where the age field is greater than 35:

```typescript
await studentsCollection.find({ age: { $gt: 35 } });

/*
  [
    {
      __id: 1,
      name: "Gonzalez Estrada",
      gender: "male",
      age: 39,
      email: "gonzalezestrada@manglo.com",
    },
    {
      __id: 2,
      name: "Burris Leon",
      gender: "male",
      age: 37,
      email: "burrisleon@manglo.com",
    },
    {
      __id: 6,
      name: "Alyce Strickland",
      gender: "female",
      age: 40,
      email: "alycestrickland@manglo.com",
    },
  ];
*/
```

### $lt Operator

Let’s find the documents whose age field is less than 35:

```typescript
await studentsCollection.find({ age: { $lt: 35 } });

/*
  [
    {
      __id: 3,
      name: "Maryanne Wagner",
      gender: "female",
      age: 32,
      email: "maryannewagner@manglo.com",
    },
    {
      __id: 4,
      name: "Fay Fowler",
      gender: "female",
      age: 24,
      email: "fayfowler@manglo.com",
    },
    {
      __id: 5,
      name: "Angeline Conner",
      gender: "female",
      age: 20,
      email: "angelineconner@manglo.com",
    },
  ];
*/
```

### $gte Operator

Suppose we have a collection of students, and we need to find all documents whose age field is greater than or equal to 35.

```typescript
await studentsCollection.find({ age: { $gte: 35 } });

/*
  [
    {
      __id: 24,
      name: "Linda Henderson",
      gender: "female",
      age: 35, ✔
      email: "lindahenderson@manglo.com",
    },
    {
      __id: 26,
      name: "Beryl Howe",
      gender: "female",
      age: 40,
      email: "berylhowe@manglo.com",
    },
    {
      __id: 28,
      name: "Russell Mcclure",
      gender: "male",
      age: 39,
      email: "russellmcclure@manglo.com",
    },
  ];
*/
```

### $lte Operator

Let’s find the documents whose age field is less than or equal to 35.

```typescript
await studentsCollection.find({ age: { $lte: 35 } });

/*
  [
    {
      __id: 29,
      name: "Mcmahon Wilkinson",
      gender: "male",
      age: 23,
      email: "mcmahonwilkinson@manglo.com",
    },
    {
      __id: 30,
      name: "Nita Knapp",
      gender: "female",
      age: 35, ✔
      email: "nitaknapp@manglo.com",
    },
    {
      __id: 31,
      name: "Sampson Morrison",
      gender: "male",
      age: 26,
      email: "sampsonmorrison@manglo.com",
    },
  ];
*/
```

### $in Operator

The following query returns documents where the age field contains the given values.

```typescript
await studentsCollection.find({ age: { $in: [20, 30, 40] } });

/*
  [
    {
      __id: 70,
      name: "Hilary Watson",
      gender: "female",
      age: 20,
      email: "hilarywatson@manglo.com",
    },
    {
      __id: 82,
      name: "Estrada Ramsey",
      gender: "male",
      age: 30,
      email: "estradaramsey@manglo.com",
    },
    {
      __id: 91,
      name: "Lela Howard",
      gender: "female",
      age: 40,
      email: "lelahoward@manglo.com",
    },
  ];
*/
```

### $nin Operator

In this example, we retrieve the documents where the age field do not contain the given values.

```typescript
await studentsCollection.find({ age: { $nin: [20, 30, 40] } });

/*
 [
    {
      __id: 1,
      name: "Gonzalez Estrada",
      gender: "male",
      age: 39,
      email: "gonzalezestrada@manglo.com",
    },
    {
      __id: 2,
      name: "Burris Leon",
      gender: "male",
      age: 37,
      email: "burrisleon@manglo.com",
    },
    {
      __id: 3,
      name: "Maryanne Wagner",
      gender: "female",
      age: 32,
      email: "maryannewagner@manglo.com",
    },
  ];
*/
```

## Logical Operators

Logical operators are used to filter data based on given conditions. They provide a way to combine multiple conditions.

snapjson provides two logical operators: $or and $and.

| Operator | Description                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------- |
| $and     | Joins two or more queries with a logical AND and returns the documents that match all the conditions. |
| $or      | Join two or more queries with a logical OR and return the documents that match either query.          |

### $and Operator

Find documents that match both the following conditions:

◻ gender is equal to "male"<br>
◻ age is between 20 and 25

```typescript
await studentsCollection.find({
  $and: [
    { gender: "male" },
    { age: { $gte: 20, $lte: 25 } },
  ]
})

/*
  [
    {
      __id: 13,
      name: "Martinez Potts",
      gender: "male",
      age: 20,
      email: "martinezpotts@manglo.com",
    },
    {
      __id: 22,
      name: "Patton Molina",
      gender: "male",
      age: 22,
      email: "pattonmolina@manglo.com",
    },
    {
      __id: 27,
      name: "Key Mercado",
      gender: "male",
      age: 25,
      email: "keymercado@manglo.com",
    },
  ];
/*
```

### $or Operator

Find documents that match either of the following conditions:

◻ gender is equal to "male" or "female"

```typescript
await studentsCollection.find({
  $or: [{ gender: "male" }, { gender: "female" }],
});

/*
  [
    {
      __id: 1,
      name: "Gonzalez Estrada",
      gender: "male",
      age: 39,
      email: "gonzalezestrada@manglo.com",
    },
    {
      __id: 2,
      name: "Burris Leon",
      gender: "male",
      age: 37,
      email: "burrisleon@manglo.com",
    },
    {
      __id: 3,
      name: "Maryanne Wagner",
      gender: "female",
      age: 32,
      email: "maryannewagner@manglo.com",
    },
  ];
*/
```

## Array Operators

snapjson provides several operators for searching arrays.
Here are the array operators provided by snapjson.

| Operator    | Description                                                                                |
| ----------- | ------------------------------------------------------------------------------------------ |
| $eq         | Matches arrays that equal to the specified array. <br> e.g. [1, 2, 3] == [1, 2, 3]         |
| $ne         | Matches arrays that do not equal to the specified array. <br> e.g. [1, 2, 3] !== [3, 2, 1] |
| $contains   | Matches arrays that contain all the specified values.                                      |
| $nocontains | Matches arrays that do not contain all the specified values.                               |

### Basic query

Suppose we have a collection of shoes, and we need to find all shoes that have 3 colors: the first color is red, second is white, and third is green.

```typescript
await shoesCollection.find({ colors: ["red", "white", "green"] });

/*
  [
    {
      __id: 231,
      price: '$88',
      colors: [ 'red', 'white', 'green' ],
      rate: 4,
      nb_view: 836,
      madeIn: 'Peru'
    }
  ]
*/

// Note that arr1 and arr2 are not equal; on the other hand, arr3 and arr4 are equal.

const arr1 = [1, 2, 3];
const arr2 = [3, 2, 1];

const arr3 = [1, [2], 3];
const arr4 = [1, [2], 3];
```

### $eq and $ne operators

We have already explained in detail their use cases. They are used in the same way for the arrays.

### $contains operator

Suppose we have a collection of shoes, and we need to find all shoes that have at least 2 colors: white and black.

```typescript
await shoesCollection.find({ colors: { $contains: ["black", "white"] } });

/*
  [
    {
      __id: 361,
      price: "$48",
      colors: ["blue", "black", "white"],
      rate: 0,
      nb_view: 163,
      madeIn: "Spain",
    },
    {
      __id: 411,
      price: "$50",
      colors: ["black", "green", "white"],
      rate: 4,
      nb_view: 100,
      madeIn: "Korea (South)",
    },
    {
      __id: 611,
      price: "$79",
      colors: ["white", "black"],
      rate: 4,
      nb_view: 784,
      madeIn: "Comoros",
    },
  ];
*/
```

### $nocontains operator

In this example, we retrieve the documents where the colors field do not contain white and black colors at once..

```typescript
await shoesCollection.find({ colors: { $nocontains: ["black", "white"] } });

/*
  [
    {
      __id: 971,
      price: "$54",
      colors: ["blue", "brown", "green"],
      rate: 0,
      nb_view: 692,
      madeIn: "Indonesia",
    },
    {
      __id: 981,
      price: "$44",
      colors: ["yellow", "white"], => Here, white color is alone.
      rate: 4,
      nb_view: 632,
      madeIn: "Malawi",
    },
    {
      __id: 991,
      price: "$45",
      colors: ["cyan", "purple", "red"],
      rate: 4,
      nb_view: 955,
      madeIn: "Malta",
    },
  ];
*/

await shoesCollection.find({ colors: { $nocontains: "white" } });

/*
  [
    {
      __id: 971,
      price: "$54",
      colors: ["blue", "brown", "green"],
      rate: 0,
      nb_view: 692,
      madeIn: "Indonesia",
    },
    {
      __id: 991,
      price: "$45",
      colors: ["cyan", "purple", "red"],
      rate: 4,
      nb_view: 955,
      madeIn: "Malta",
    },
  ];
*/
```

# Working with Regular Expressions

snapjson supports regular expressions for string-based queries. You can use regular expressions with various operators to search for patterns within string.

```typescript
await studentsCollection.find({ email: /.com$/ });
// $eq
await studentsCollection.find({ email: { $eq: /.com$/ } });
// $ne
await studentsCollection.find({ email: { $ne: /.com$/ } });
// $in
await studentsCollection.find({ email: { $in: [/.com$/, /.org$/] } });
// $nin
await studentsCollection.find({ email: { $nin: [/.com$/, /.org$/] } });
// $contains
await shoesCollection.find({ colors: { $contains: [/re/, "cyan"] } });

/*
  [
    {
      __id: 631,
      price: "$91",
      colors: ["white", "green", "cyan"],
      rate: 0,
      nb_view: 817,
      madeIn: "Armenia",
    },
    {
      __id: 721,
      price: "$11",
      colors: ["red", "blue", "cyan"],
      rate: 1,
      nb_view: 849,
      madeIn: "Moldova",
    },
    {
      __id: 991,
      price: "$45",
      colors: ["cyan", "green", "red"],
      rate: 4,
      nb_view: 955,
      madeIn: "Malta",
    },
  ];
*/
```

## Reporting Issues

If you encounter any issues, have questions, or want to contribute to the project, please visit the [GitHub repository](https://github.com/ec-son/snapjson/issues) and open an issue.

## License

This project is licensed under the [MIT License](https://github.com/ec-son/snapjson/blob/main/LICENSE).

---
