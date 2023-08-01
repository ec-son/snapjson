# orm-json

[![npm version](https://badge.fury.io/js/orm-json.svg)](https://badge.fury.io/js/orm-json)

> **orm-json** is a lightweight NoSQL object-relational mapping (ORM) library for Node.js, written in TypeScript. It allows you to store data in JSON files, with each collection represented as an array of documents.

## Installation

```bash
npm install orm-json
```

## Getting Started

To use the orm-json module, follow these simple steps:

1. Import the `OrmJson` class:

```typescript
import { OrmJson, createCollection } from "orm-json";
```

2. Create an instance of `OrmJson` by providing the optional path to the database file (default path is "db/db.json"):

```typescript
const path = ""; // path of database file.
const orm = new OrmJson(path);
```

3. Define your data schema using TypeScript interfaces (the `__id` property will be added automatically for the primary key):

```typescript
interface UserSchema {
  name: string;
  email: string;
  password: string;
  age?: number;
}
```

4. Create a collection:

```typescript
// Option 1: Simple collection creation
const collection = await orm.createCollection("user"); // it returns the collection name when it is created.

// Option 2: Creating multiple collections at once
const collections = await orm.createCollections(["user", "teacher", ...]);

// Option 3: Creating collection with unique properties
const collection = await orm.createCollection({
  name: "user",
  uniqueProperties: ["name"], // This property defines all properties that will be unique.
});
```

Alternatively, you can use a shortcut helper function:

```typescript
// Instead of orm.createCollection and orm.createCollections, you can use:
createCollection("user"); // Import from orm-json.
```

5. Remove a collection:

```typescript
await orm.removeCollection("collectionName"); // Provide the name of the collection as a string or an array of strings.
```

6. Use collection methods for querying:

```typescript
const userCollection = await orm.collection<UserSchema>("user");

// Inserting documents
await userCollection.insertOne({ name: "Alice", age: 25 });
await userCollection.insertMany([
  { name: "Bob", age: 30 },
  { name: "Charlie", age: 22 },
]);

// Updating documents
const data = { age: 10 };
const query = { state: "notAllowed" };
await userCollection.updateOne(data, query);

// Finding documents
const document = await userCollection.findOne({ eg: { __id: 1 } });
const documents = await userCollection.findMany({ age: { $gt: 25 } });

// Count and size
const documentCount = await userCollection.count();
const collectionSize = await userCollection.size();
```

7. Use document methods:

```typescript
const bob = await userCollection.findById(1);

if (bob) {
  console.log(bob.toObject()); // Convert document to a plain object
  bob.age = 10;
  await bob.save(); // Save the changes to the document
  await bob.delete(); // Delete the document from the collection
}
```

8. Additional methods of OrmJson:

```typescript
const collections = await orm.getCollections(); // Returns all collection names available in the database.
const databaseSize = await orm.size(); // Returns the size of the database file.
```

## Reporting Issues

If you encounter any issues, have questions, or want to contribute to the project, please visit the [GitHub repository](https://github.com/your_username/orm-json) and open an issue.

## License

This project is licensed under the [MIT License](LICENSE).

---
