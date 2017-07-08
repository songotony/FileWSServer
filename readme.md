[![Build Status](https://travis-ci.org/TwiceCast/FileWSServer.svg?branch=master)](https://travis-ci.org/TwiceCast/FileWSServer)
# FileWSServer
A server which transfer files through websockets

## Table of contents
* [Synopsis](#synopsis)
* [Installation](#installation)
* [Configuation](#configuration)
* [Protocol](#protocol)
	* [Template message](#template-message)
	* [Authentication](#authentication)
	* [File part](#file-part)
		* [Auth for file](#auth-for-file)
		* [Get file](#get-file)
		* [Post file](#post-file)
		* [Delete file](#delete-file)
	* [Pullrequest part](#pullrequest-part)
		* [Auth for pullrequest](#auth-for-pullrequest)
		* [Creation of pullrequest](#creation-of-pullrequest)
		* [Validation of pullrequest](#validation-of-pullrequest)
	* [Chat part](#chat-part)
		* [Auth for chat](#auth-for-chat)
		* [Message](#message)
	* [Error response](#error-response)
		* [Bad authentication response](#bad-authentication-response)
		* [Bad parameters response](#bad-parameters-response)
		* [Fail read file response](#fail-read-file-response)
		* [Fail read path response](#fail-read-path-response)
		* [Fail write file response](#fail-write-file-response)		

## Synopsis

This server is created for the TwiceCast project, an Epitech Innovativ Project, it will be used by the streamer to transfer his source code for the viewers.

## Installation

You can install it with :

```
npm install file-ws-server
```

You can launch it with :

```
npm start [port number]
```

## Configuration

You can create a `config.json` file for some parameters. Here is an example :

```javascript
{
  "port":Port number,
  "baseDir":"Path/to/receive/files",
  "key":"Secret key for JWT"
}
```

`port` is used when not in argument. By default, it is set to 3005.

`baseDir` is used to set the directory where files will be transfered. By default, it is set to "./".

`key` is used to set the key signature that will be used to verify the token of the client. By default, it is set to "secret".

## Protocol

### Template message

The basic template message to send is :

```javascript
{
  "type":"The part of the server aimed",
  "subtype":"The functionnality of the part aimed",
  "data" : {
  }
}
```

### Authentication

WARNING: The token part is not functionnal

For using certains parts of the server (like posting files), you must be authentified.

You can do that by sending :

```javascript
{
  "type":"authenticate",
  "data":{
	"file" : {
		"username" : "Streamer's username",
		"project" : "Streamers's project"
	},
	"chat" : {
		"username":"User's username",
		"room":"User's room (can be the stream's name coupled with streamer's name)"
	},
	"pullrequest" : {
		"username" : "User's username",
		"streamer" : "Streamer's username actually watched by the user",
		"project" : "Project's name actually watched by the user"
	}
    "token":"your token"
  }
}
```

### File part

#### Auth for file

WARNING: Consider using basic authentication

When a streamer use this part, he has to authenticate by sending :

```javascript
{
	"type":"file",
	"subtype":"auth",
	"data": {
		"username":"Streamer's username",
		"project":"Streamer's project"
	}
}
```

In case of success, response will be :

```javascript
{
	"code":200,
	"type":"fileAuth",
	"data":"OK"
}
```

#### Get file

You can get a file, a directory or a complete project by sending :

```javascript
{
	"type":"file",
	"subtype":"get",
	"data": {
		"username":"streamer's username",
		"project":"streamer's project",
		"name":"/path/to/file or directory aimed",
		"recursively":false
	}
}
```

`name` parameters can be ommited to get the entire project.

By default, `recursively` is set to false.

In case of success, responses will be :

```javascript
{
	"code":200,
	"type":"fileGet",
	"data": {
		"name":"/path/to/file",
		"content":"content of a part of the file",
		"part":part number,
		"maxPart":number of part that will be sent
	}
}
```

#### Post file

Streamer authentified can post a file by sending :

```javascript
{
	"type":"file",
	"subtype":"post",
	"data": {
		"name":"/path/to/file aimed",
		"content":"content of a part of the file",
		"part":part number,
		"maxPart":number of part that will be sent
	}
}
```

`part` and `maxPart` can be ommited when sending the complete content.

WARNING: `content` must be encoded in base64.

The file will be saved at `config.baseDir/sender.username/sender.project/message.data.name`.

In case of success, response will be :

```javascript
{
	"code":200,
	"type":"filePost",
	"message":"OK"
}
```

#### Delete file

Streamer authentified can delete a file by sending :

```javascript
{
	"type":"file",
	"subtype":"delete",
	"data": {
		"name":"/path/to/file aimed"
	}
}
```

In case of success, response will be :

```javascript
{
	"code":200,
	"type":"fileDelete",
	"message":"OK"
}
```

### Pullrequest part

#### Auth for pullrequest

WARNING: Consider using basic authentication

When a user use this part, they must be authentified by sending :

```javascript
{
	"type":"pullrequest",
	"subtype":"auth",
	"data": {
		"username" : "User's username",
		"streamer" : "Streamer's username actually watched by the user",
		"project" : "Project's name actually watched by the user"
	}
}
```

In case of success, response will be :

```javascript
{
	"code" : 200,
	"type" : "pullRequestAuth",
	"data" : "OK"
}
```

#### Creation of pullrequest

A user authentified can create a pullrequest by sending :

```javascript
{
	"type" : "pullrequest",
	"subtype" : "creation",
	"data" : {
		"title" : "Pullrequest's title",
		"description" : "Pullrequest's description (can be empty)"
	}
}
```

After that, the user can send file using the websocket file part (no need to authenticate on file part), "/" should be the directory of the pullrequest.

In case of success, response will be :

```javascript
{
	"code" : 200,
	"type" : "pullRequestCreation",
	"data" : "OK"
}
```

#### Validation of pullrequest

In order to validate and send the pullrequest to the streamer, the user must send :

```javascript
{
	"type" : "pullrequest",
	"subtype" : "finish"
}
```

In case of success, response will be :

```javascript
{
	"code" : 200,
	"type" : "pullRequestFinish",
	"data" : "OK"
}
```

The streamer will be notified by receiving :

```javascript
{
	"code" : 200,
	"type" : "pullRequestCreated",
	"data" : {
		"id" : "Pullrequest's id, necessary to fetch it (located at "/id/")",
		"owner" : "Username of the creator of the pullrequest",
		"title" : "Pullrequest's title",
		"description" : "Pullrequest's description (if any)",
		"data" : "Pullrequest's date of creation"
	}
}
```

### Chat part

#### Auth for chat

WARNING: Consider using basic authentication

When a user use this part, they must be authentified by sending :

```javascript
{
	"type":"chat",
	"subtype":"auth",
	"data": {
		"username":"User's username",
		"room":"User's room (can be the stream's name coupled with streamer's name)"
	}
}
``` 

In case of success, response will be :

```javascript
{
	"code":200,
	"type":"chatAuth",
	"data":"OK"
}
```

#### Message

A user authentified can send a message to their room by sending :

```javascript
{
	"type":"chat",
	"subtype":"message",
	"data": {
		"message":"Content of the message"
	}
}
```

Other users connected to the room will receive the same message.

In case of success, response will be :

```javascript
{
	"code":200,
	"type":"chatMessage",
	"data":"OK"
}
```

### Error response

In case of failure, here are the possible responses :

#### Bad authentication response

```javascript
{
	"code" : 401,
	"type" : "badAuthError",
	"message" : "Error's description message"
}
```

This error means you're not authentified, your token is wrong or expired.

#### Bad parameters response

```javascript
{
	"code" : 400,
	"type" : "badParametersError",
	"message" : "Error's description message"
}
```

This error means that you're missing some parameters to use this path.

#### Fail read file response

```javascript
{
	"code" : 409,
	"type" : "failReadFileError",
	"message" : "File ${filename} doesn't exist or cannot be read"
}
```

This error means that you're trying to fetch an inexistant file or a file that cannot be read.

#### Fail read path response

```javascript
{
	"code" : 409,
	"type" : "failReadPathError",
	"message" : "Path ${pathname} doesn't exist or cannot be read"
}
```

This error means that you're trying to fetch an inexistant path or a path that cannot be read.

#### Fail write file response

```javascript
{
	"code" : 409,
	"type" : "failWriteFileError",
	"message" : "File ${filename} cannot be created or written"
}
```

This error means that you're trying to send a file that already exists and cannot be erased.
