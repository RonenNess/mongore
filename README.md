# Mongore

`Mongore` provides an easy way to create native JavaScript classes with MongoDB backend.
The idea is to make Mongo pretty much invisible and still enjoy Mongo-powered persistency and fast search.

*Fair warning: This project is still undertested, use at your own risk.*

Lets take a look at a quick example. 
First, lets connect to MongoDB (for simplicity, I will ignore callbacks and validations for now):

```js
const MongoClient = require('mongodb').MongoClient
const Mongore = require('mongore')

Mongore.Client.connect(MongoClient, "mongodb://localhost:27017/dogsDb", "dogsDb");
```

Now lets define a model:

```js
// define a class to represent a dog 
class Dog extends Mongore.Model
{
    // create the dog with name and breed.
    constructor(name, breed) 
    {
        super();
        this.name = name;
        this.breed = breed;
    }

    // bark.
    bark() 
    {
        if (this.breed == "chihuahua") {
            console.log("*angry rat noises*");
        }
        else {
            console.log("Woof!");
        }
    }

    // give dog a bone.
    // note: cooked bones are actually dangerous for dogs, you should never give your dog cooked bones!
    giveBone()
    {
        this.bonesEaten++;
        this.bark();
    }

    // calculate dog's age based on when it was created in DB.
    get age()
    {
        return (new Date()).getYear() - this.mongore.creationTime.getYear());
    }
}

// define the dog fields that will be stored in DB:
Dog.buildModel(
    fields: {
        _id: new Mongore.Fields.StringField({source: "name", maxLength: 16}), 
        breed: new Mongore.Fields.ChoiceField({choices: ["chihuahua", "bulldog", "golden", "lab"]}),
        bonesEaten: new Mongore.Fields.NumericField({default: 0, parser: parseInt})
    }
);
```

Using the model is super easy!

```js
var myDog = new Dog("Rex", "golden");
myDog.giveBone();
myDog.mongore.save();
```

Or to load a dog from db.. 

```js
Dog.mongore.load("Rex", (myDog) => {
    console.log("My dog ate ", myDog.bonesEaten, "bones.");
});
```

## Key Features
 
Mongore's key features are:

- Using DB models like plain JavaScript classes.
- Built-in field types with validation and automatic 'cleanup' (also convert to MongoDB validators).
- Useful added metadata like creation time, last update time, versioning, ect.
- Optimized - will only save changed fields, if anything was changed.
- Foreign keys that turn into model instances when loaded.
- Automatic collections setup.


# Using Mongore

## Install

To install via npm:

```
npm install mongore
```

## Initialize

Before using Mongore, you need to initialize a connection (note: its OK to define your models before initializing, you only need to connect before loading / saving objects):

```js
const Mongore = require('./mongore');
const MongoClient = require('mongodb').MongoClient;

Mongore.Client.connect(MongoClient, Config.db.url, Config.db.name, () => {
    // ready for action!
})
```

As you can see `Mongore` don't require `MongoDB` directly. This means you can use whatever version you want or wrap Mongo's client yourself, as long as the basic API of insertOne, updateOne, findOne is kept.

## A Small Example..

Now lets define some Models, ie. persistent JS objects with MongoDB backend.
For this example, we'll make a simple forum app.

### Step 1: Users Model

We'll start with the `User` model:

```js
/**
 * Represent a user.
*/
class User extends Mongore.Model
{
    /**
     * Create a new user.
    */
    constructor(username, password, userType) 
    {
        super();
        this.username = username;
        this.password = password;
        this.userType = userType;
    }

    /**
     * Get if admin user.
    */
    get isAdmin()
    {
        return this.userType === "admin";
    }

    /**
     * Create and return a new board (don't save it).
    */
    createBoard(name)
    {
        if (!this.isAdmin) {
            throw new Error("Only admins can open boards!");
        }
        return new Board(name, this);
    }
}
User.buildModel(
    fields: {
        _id: new Mongore.Fields.StringField({source: "username", maxLength: 16}),
        userType: new Mongore.Fields.ChoiceField({choices: ["guest", "registered", "admin"]}),
        password: new Mongore.Fields.StringField()
    }
);
```

So what's going on above?

1. First we define a `User` class that get username, password, and type. It also have a method to create a board (will be defined next) and a getter to check if type is admin.
2. Next, we define the persistent part of the model, which is the fields that will represent this object in MongoDB.
    1. First we define the _id field. We create it as a `string` with max length of 16 characters, and we make it a proxy of the `username` property.
    2. Next we add a user type choice field, which is a string that will only accept one of the listed values: 'guest', 'registered', or 'admin'.
    3. Finally, we add a password field as plain text (horrible when considering security, I know).

Once the fields are defined, you can use them just as you would with any JS property from the instance, as demonstrated in the constructor and in the class's methods.

#### Create The Collection

As you probably know, MongoDB works with `collections`, and while you can let MongoDB create collections with default values automatically, its best to define them with validations and other metadata (like indexes). So lets ask `Mongore` to create a collection for Users:

```js
User.mongore.createCollection(() => {
    console.log("Users collection is now ready!");
});
```

Obviously you don't have to call `createCollection` every time your app starts (although there's no harm in that), so its best to create short `init-db.js` script, and put all the `createCollection()` calls there. Call this script whenever you change or define a new Model. 

#### Create A User Instance

Now lets create and save a new user:

```js
var user = new User("Billy", "pass1234", "admin");
user.mongore.save(() => {
    console.log("Great success!");
},
(err) => {
    console.log("Error! ", err);
});
```

That's it! You can now check your MongoDB and see a `Users` collection with a single object, `Billy`.

#### Load A User

So how do we load the user we just created? Easy!

```js
User.mongore.load("Billy", (user) => {
    console.log(`Welcome back, ${user.username}!`);
});
```

#### A Word About `mongore` Property

All the fields you define in your model are created as-if they were plain properties under your class. However, as you noticed above, we also have the `mongore` object under the *instance* and the *class* itself.

This object contains the API and metadata of `mongore`, and represent the bridge between your plain JS object and the Database.

* **<Model>.mongore** contains the API related to the Model itself, like the `load()` and `createCollection()` methods.
* **<instance>.mongore** contains the API related to a specific instance, like the `save()` method and other useful functions described later.

### Step 2: Board Model

Continuing with our example, time to define the `Board` model to represent a board:

```js
/**
 * Represent a board.
*/
class Board extends Mongore.Model
{
    /**
     * Create a new board.
    */
    constructor(name, creator) 
    {
        super();
        this.name = name;
        this.creator = creator;
    }

    /**
     * Create and return a new message (don't save it).
    */
    createMessage(user, text)
    {
        return new Message(this, user, text);
    }
}
Board.buildModel(
    fields: {
        _id: new Mongore.Fields.StringField({source: "name", maxLength: 16}),
        creator: new Mongore.Fields.ForeignKeyField({model: User, canBeNull: false}),
    }
);
```

The `name` field is similar to `User.username` and will not be discussed here. The new field, `creator` is interesting.

A `ForeignKeyField` is a field that expect an instance of the provided Model (in this case, `User`). In Mongo, it will be stores as the instance's `_id` field. When an instance of `Board` is loaded, it will also load all its foreign keys.

Note that the success callback will be called before foreign keys are loaded. Lets take a look at how we load a `Board` instance, wait for the `User` foreign key to be ready, then performing an action:

```js
Board.mongore.load("myBoard", (board) => {
    board.creator.mongore.onLoaded((user) => {
        board.createMessage(user, "Hi all, just logged in! - XOXO").mongore.save();
    })
})
```

### Step 3: Message Model

And finally, lets create the message Model:

```js
/**
 * Represent a single text message in one of the forum's boards.
*/
class Message extends Mongore.Model
{
    /**
     * Create a new message.
    */
    constructor(board, author, msg) 
    {
        super();
        this.board = board;
        this.author = author;
        this.msg = msg;
    }

    /**
     * Give this message a thumb up.
    */
    upvote()
    {
        this.score++;
    }

    /**
     * Give this message a thumb down.
    */
    downvote()
    {
        this.score--;
    }
}
Message.buildModel(
    fields: {
        board: new Mongore.Fields.ForeignKeyField({model: Board, canBeNull: false}),
        author: new Mongore.Fields.ForeignKeyField({model: User, canBeNull: false}),
        msg: new Mongore.Fields.StringField(),
        score: new Mongore.Fields.NumericField({parser: parseInt, index: true})
    }
);
```

The above is pretty similar to the previous models, with a just a minor thing to notice: `index: true` will set the `score` field as an index, which means we can quickly search on it.

That's it for the example, now lets explore the API!


## Mongore.Model.buildModel()

The main function that turn your JS class into a proper Model is the `buildModel()` method, as demonstrated in the example above.
This method accept the following arguments (as a dictionary):

* **fields**: A dictionary of fields to attach to this Model. Every field will receive a corresponding getter and setter, and will be stored in MongoDB. Field types are described later.
* **maxSizeInBytes**: If defined, will limit this Model's collection to this number of bytes.
* **maxCount**: If defined, will limit number of records in this Model's collection to this amount.
* **collectionName**: Collection name to use for this model. If not defined, will use class name + 's'.

## Fields

When you build your Model you specify one or more fields to include in the DB scheme. 
As briefly mentioned before, every field you define will create a getter and setter in your class with the same name. In addition, every field define validations and cleanup logic to trigger when writing / reading from DB, as well as validators to set in MongoDB itself (there are validations in app level and in Mongo's level).

There are several built-in Field types (its really easy to define new ones) and every field accept different arguments. However, all fields support the following:

* **default**: Default value to set for the field.
* **source**: If provided, will always copy value from a given property in the object before writing to DB. When loaded, will also set the property.
* **sourceReadonly**: If 'source' is provided and 'sourceReadonly' is true, will only copy from source when writing to DB, but won't set the property when loaded.
* **canBeNull**: Available for most types; allow null value.
* **index**: If true, will make this field an index field.
* **unique**: If true and indexed, will make this field unique.

Now lets describe all the field types:

### GenericField

A generic field type without validations or cleanup logic.

### BooleanField

A boolean field.

### ChoiceField

A choice field that enforce the value to be from a set of options. 

Have the following additional options:

* **choices**: List of choices to pick from.

### DateField

A date field (store JavaScript Date objects).

Have the following additional options:

* **autoNow**: If true, will always be set to current time when saved.

### DictionaryField

A dictionary field.

Have the following additional options:

* **schema**: Optional dictionary of fields to describe the desired dictionary schema.

Note: when a schema is defined, you also have to define a default value that matches it.

### ForeignKeyField

A field that point on another Model's instance, and load it automatically when loaded from DB (in MongoDB its stored as _id).

Have the following additional options:

* **model**: Model type this field points on (mandatory).

### ListField

A list field.

Have the following additional options:

* **maxItems**: Optional list size limit.
* **itemsType**: An optional field instance to validate all list entries before save.
* **removeDuplicates**: If true, will remove duplications before saving.

### NumericField

A number (int or float) field.

Have the following additional options:

* **min**: Optional min value.
* **max**: Optional max value.
* **parser**: Optional parser to treat numbers - should use parseInt for integers or parseFloat for floats (default to parseFloat).

### StringField

A string field.

Have the following additional options:

* **maxLength**: Optional min length.
* **minLength**: Optional max length.


## Mongore.Model Callbacks

The `Mongore.Model` is the base class all your models should extend. Except for the fields you define, which will became getters and setters under your class, most of your model's API will remain unchanged as mongore's API is kept under the `mongore` accessor.

However, there are some callbacks you can implement to respond to DB related events:

### afterLoadedFromDB()

Will be called whenever the instance is successfully loaded from DB.

### beforeSaveToDB()

Will be called before saving an instance to the DB.

### afterSavedToDB()

Will be called after an instance was successfully saved.

### afterDeletedFromDB()

Will be called after the instance was deleted from DB.


## Mongore.Model.mongore

Every Model *class* you define will be coupled with a `mongore` API that implements the Model-related API.
This is the main object you access to use Mongore when you don't have an instance. 

The following is the key functionality of the **class-level API**:

### load()

Load and return an instance from DB.

### delete()

Delete an instance from DB.
Note: won't invoke `afterDeletedFromDB` callbacks.

### deleteMany()

Delete multiple instances from DB.
Note: won't invoke `afterDeletedFromDB` callbacks.

### createCollection()

Create the collection (with all validation and indexes) for this Model.

### dropCollection()

Drop the collection of this Model.

### getDefault()

Get the default value for a given field name.

### collectionName

Get the collection name used for this model.

### fieldNames

List with all field names of this model (not including internal stuff).


## Mongore.Instance.mongore

Every model *instance* you create will be coupled with a `mongore` API that implements the Instance API.
This is the main object you access to use Mongore. 

The following is the key functionality of the **instance-level API**:

### save()

Save the instance to DB.

### reload()

Reload this object from DB.

### delete()

Delete this object from DB.

### onLoaded

Optional callback to invoke on first time this instance is loaded from DB.

### isDirty

Return if this instance have any changed fields that needs to be saved to DB.

### dirtyFields

Get a list of field names that are dirty.

### setToDefault()

Set a field to its default value.

### creationTime

Get the creation time of the object (first time it was insert to DB).
Note: does not update automatically, call reload() to update this.

### lastUpdateTime

Get the last update() / insert() time of this object.
Note: does not update automatically, call reload() to update this.

### objectVersion

An auto-incremented number representing the number of times this object was updated in DB.
Note: does not update automatically, call reload() to update this.

### id

Get the instance primary id field.

### isLoadedFromDB

Return if the object was loaded from DB.

### isSavedToDB

Return if this specific instance was ever saved to DB.

### isInDB

Return if the specific instance was either loaded from DB, or ever saved to it.
In other words, if its present in DB.

### lastLoadTime

Return last time this object was loaded (or reloaded) from DB.

### collectionName

Collection name used for this instance.

### fieldNames

List with all field names of this model (not including internal stuff).


## Logging

If you want to receive logs from `Mongore`, you can set a logger instance with `Mongore.setLogger()`.

The logger should implement all the basic logging methods (error, warn, info, verbose, debug, silly), and it is recommended to add an automatic label to mark that these logs originalte from Mongore, so they won't get mixed up with your other logs (or as an alternative - send to a different file).

# License

`Mongore` is distributed under the MIT license and is free for any purpose.