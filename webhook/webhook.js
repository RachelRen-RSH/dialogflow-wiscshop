const express = require("express");
const { WebhookClient } = require("dialogflow-fulfillment");
const app = express();
const fetch = require("node-fetch");
const base64 = require("base-64");

let username = "";
let password = "";
let token = "";
let category = "";
let product = "";
let count = 0;
let tag = "";

USE_LOCAL_ENDPOINT = false;
// set this flag to true if you want to use a local endpoint
// set this flag to false if you want to use the online endpoint
ENDPOINT_URL = "";
if (USE_LOCAL_ENDPOINT) {
  ENDPOINT_URL = "http://127.0.0.1:5000";
} else {
  ENDPOINT_URL = "http://cs571.cs.wisc.edu:5000";
}

async function getToken() {
  let request = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + base64.encode(username + ":" + password),
    },
  };

  const serverReturn = await fetch(ENDPOINT_URL + "/login", request);
  const serverResponse = await serverReturn.json();
  token = serverResponse.token;

  return token;
}

app.get("/", (req, res) => res.send("online"));
app.post("/", express.json(), (req, res) => {
  const agent = new WebhookClient({ request: req, response: res });

  function welcome() {
    agent.add("Webhook works!");
    console.log(ENDPOINT_URL);
  }

  async function showMessage(isUser, text) {

    let request = {
      // get what user says
      "method": "POST",
      "headers": {
        "Content-Type": "application/json",
        "x-access-token": token,
        Authorization: "Basic " + base64.encode(username + ":" + password),
      },
      "body": JSON.stringify({
        isUser: isUser,
        text: text,
      })
    }

    await fetch(ENDPOINT_URL + "/application/messages", request);
  }

  async function login() {

    // You need to set this from `username` entity that you declare in DialogFlow
    username = agent.parameters.username;
    // You need to set this from password entity that you declare in DialogFlow
    password = agent.parameters.password;
    await getToken();

    if (token) {
      let request = {
        "method": "DELETE",
        "headers": {
          "Content-Type": "application/json",
          "x-access-token": token,
          Authorization: "Basic " + base64.encode(username + ":" + password),
        },

      }

      await fetch(ENDPOINT_URL + "/application/messages", request);

    }
    let text = "Successfully logged in, Welcome to WiscShop!"
    agent.add(text);

    let request = {
      "method": "POST",
      "headers": {
        "Content-Type": "application/json",
        "x-access-token": token,
        Authorization: "Basic " + base64.encode(username + ":" + password),
      },
      "body": JSON.stringify({
        isUser: false,
        text: text,
      })
    }

    await fetch(ENDPOINT_URL + "/application/messages", request);

  }

  async function categories() {

    let request = {
      // get what user says
      "method": "POST",
      "headers": {
        "Content-Type": "application/json",
        "x-access-token": token,
        Authorization: "Basic " + base64.encode(username + ":" + password),
      },
      "body": JSON.stringify({
        isUser: true,
        text: agent.query,
      })
    }

    await fetch(ENDPOINT_URL + "/application/messages", request);

    // get the categories
    let categories = await fetch(ENDPOINT_URL + "/categories");
    let categoryList = await categories.json();
    text = categoryList.categories.toString();

    agent.add(text);
    showMessage(false, text);
  }

  async function tags() {
    // show users' message
    category = agent.parameters.category;
    showMessage(true, agent.query);
    // get the tags

    let tags = await fetch(ENDPOINT_URL + "/categories/" + category + "/tags");
    let tagsList = await tags.json();
    text = tagsList.tags.toString();

    agent.add(text);
    showMessage(false, text);
    ///categories/<category_title>/tags
  }

  async function cart() {
    showMessage(true, agent.query);
    console.log("helllalsdfasdf")
    let request = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token
      },
    };

    const serverReturn = await fetch(ENDPOINT_URL + "/application/products", request);
    const serverResponse = await serverReturn.json();
    console.log(serverResponse.products);
    let list = serverResponse.products;
    console.log(list.length);
    let text = "There are ";
    let price = 0;
    console.log(list);
    if (list.length == 0) {
      text = "There are no items in your cart, the total price is " + price;
    }
    else {
      for (let i = 0; i < list.length; i++) {
        text += list[i].count + " " + list[i].name + ",";
        price += list[i].price * list[i].count;
      }
      text += "The total price is " + price;
    }

    agent.add(text);
    showMessage(false, text);
  }

  async function productInfo() {
    let text = "";
    product = agent.parameters.product;
    showMessage(true, agent.query);
    // get the all products
    let request = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token
      },
    };

    const serverReturn = await fetch(ENDPOINT_URL + "/products", request);
    const serverResponse = await serverReturn.json();
    console.log(serverResponse.products);
    let list = serverResponse.products;
    console.log(list.length); // works good
    console.log(product.toString());
    //get the specified product
    for (let i = 0; i < list.length; i++) {
      if (product.toString() == list[i].name) {
        let req = {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-access-token": token
          },
        };

        const Return = await fetch(ENDPOINT_URL + "/products/" + list[i].id, req);
        const information = await Return.json();
        console.log(information);
        text = "The product name is " + information.name + ". Its category is " + information.category + ". Its description is " + information.description + ". Its price is " + information.price;

        // get the reviews
        let requ = {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-access-token": token
          },
        };
        console.log("helloooo");
        const returnInfo = await fetch(ENDPOINT_URL + "/products/" + list[i].id + "/reviews", requ);
        const reviews = await returnInfo.json();
        const review = reviews.reviews;
        console.log(review);
        if (review.length == 0) {
          text += " No reviews";
        }
        else {
          let reviewText = " The reviews are";
          let totalRating = 0;
          console.log(review[0].title);
          console.log(review.length);
          for (let j = 0; j < review.length; j++) {
            console.log(review[j].title);
            reviewText += review[j].title + ": " + review[j].text + ",";
            totalRating += review[j].stars;
          }
          let averageRating = totalRating / review.length;
          text += reviewText + "The average rating is " + averageRating;
        }
      }
    }


    agent.add(text);
    showMessage(false, text);
  }

  async function navigationHome() {
    showMessage(true, agent.query);
    let request = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token
      },
      body: JSON.stringify({
        "back": false,
        "dialogflowUpdated": true,
        "page": "/" + username,
      }),
    };

    const serverReturn = await fetch(ENDPOINT_URL + "/application/", request);
    const serverResponse = await serverReturn.json();

    let text = "welcome to the homepage!";
    agent.add(text);
    showMessage(false, text);
  }

  async function navigationCart() {
    showMessage(true, agent.query);
    let request = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token
      },
      body: JSON.stringify({
        "back": false,
        "dialogflowUpdated": true,
        "page": "/" + username + "/cart",
      }),
    };

    const serverReturn = await fetch(ENDPOINT_URL + "/application/", request);
    const serverResponse = await serverReturn.json();

    let text = "Successfully navigate to the cart page!";
    agent.add(text);
    showMessage(false, text);
  }

  async function navigationCategory() {
    category = agent.parameters.Category;
    showMessage(true, agent.query);
    let request = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token
      },
      body: JSON.stringify({
        "back": false,
        "dialogflowUpdated": true,
        "page": "/" + username + "/" + category,
      }),
    };

    const serverReturn = await fetch(ENDPOINT_URL + "/application/", request);
    const serverResponse = await serverReturn.json();

    let text = "Successfully navigate to the " + category + " page!";
    agent.add(text);
    showMessage(false, text);
  }

  async function CartReview() {
    showMessage(true, agent.query);
    let request = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token
      },
      body: JSON.stringify({
        "back": false,
        "dialogflowUpdated": true,
        "page": "/" + username + "/cart-review",
      }),
    };

    const serverReturn = await fetch(ENDPOINT_URL + "/application/", request);
    const serverResponse = await serverReturn.json();

    let text = "Now you can review your cart!";
    agent.add(text);
    showMessage(false, text);
  }

  async function CartConfirm() {
    showMessage(true, agent.query);
    let request = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token
      },
      body: JSON.stringify({
        "back": false,
        "dialogflowUpdated": true,
        "page": "/" + username + "/cart-confirmed",
      }),
    };

    const serverReturn = await fetch(ENDPOINT_URL + "/application/", request);
    const serverResponse = await serverReturn.json();

    let text = "Your order has been confirmed! Thank you very much!";
    agent.add(text);
    showMessage(false, text);
  }

  async function AddCart() {
    showMessage(true, agent.query);
    count = agent.parameters.number;
    product = agent.parameters.product;
    let text = "Add to the cart successfully";
    // get the all products
    let request = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token
      },
    };

    const serverReturn = await fetch(ENDPOINT_URL + "/products", request);
    const serverResponse = await serverReturn.json();
    console.log(serverResponse.products);
    let list = serverResponse.products;
    console.log(list.length); // works good
    console.log(product.toString());
    //get the specified product
    for (let i = 0; i < list.length; i++) {
      if (product.toString() == list[i].name) {
        let req = {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-access-token": token
          },
        };

        const Return = await fetch(ENDPOINT_URL + "/products/" + list[i].id, req);
        const information = await Return.json();
        console.log(information);
        /////////////////////////////////
        console.log(count);
        for (let j = 0; j < count; j++) {
          let req = {
            "method": "POST",
            "headers": {
              "Content-Type": "application/json",
              "x-access-token": token,
              Authorization: "Basic " + base64.encode(username + ":" + password),
            },
          }

          await fetch(ENDPOINT_URL + "/application/products/" + list[i].id, req);
        }

      }
    }
    agent.add(text);
    showMessage(false, text);
  }

  async function DeleteCart() {
    showMessage(true, agent.query);
    count = agent.parameters.number;
    product = agent.parameters.product;
    let text = "Remove the item(s) successfully";
    // get the all products
    let request = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token
      },
    };

    const serverReturn = await fetch(ENDPOINT_URL + "/products", request);
    const serverResponse = await serverReturn.json();
    console.log(serverResponse.products);
    let list = serverResponse.products;
    console.log(list.length); // works good
    console.log(product.toString());
    //get the specified product
    for (let i = 0; i < list.length; i++) {
      if (product.toString() == list[i].name) {
        let req = {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-access-token": token
          },
        };

        const Return = await fetch(ENDPOINT_URL + "/products/" + list[i].id, req);
        const information = await Return.json();
        console.log(information);
        /////////////////////////////////
        console.log(count);
        for (let j = 0; j < count; j++) {
          let request = {
            "method": "DELETE",
            "headers": {
              "Content-Type": "application/json",
              "x-access-token": token,
              Authorization: "Basic " + base64.encode(username + ":" + password),
            },

          }
          await fetch(ENDPOINT_URL + "/application/products/" + list[i].id, request);
        }

      }
    }
    agent.add(text);
    showMessage(false, text);
  }

  async function ClearCart() {
    showMessage(true, agent.query);
    let text = "clear the cart successfully!";
    let request = {
      "method": "DELETE",
      "headers": {
        "Content-Type": "application/json",
        "x-access-token": token,
        Authorization: "Basic " + base64.encode(username + ":" + password),
      },

    }
    await fetch(ENDPOINT_URL + "/application/products", request);
    agent.add(text);
    showMessage(false, text);
  }

  async function AddTags() {
    showMessage(true, agent.query);
    tag = agent.parameters.tag;
    let text = "Filter the tag successfully";
    // get the all products
    let request = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token
      },
    };

    const serverReturn = await fetch(ENDPOINT_URL + "/application/tags/" + tag, request);
    const serverResponse = await serverReturn.json();

    agent.add(text);
    showMessage(false, text);
  }

  async function DeleteTags() {
    showMessage(true, agent.query);
    tag = agent.parameters.tag;
    let text = "Remove the tag successfully";
    let request = {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token
      },
    };

    const serverReturn = await fetch(ENDPOINT_URL + "/application/tags/" + tag, request);
    const serverResponse = await serverReturn.json();

    agent.add(text);
    showMessage(false, text);
  }


  let intentMap = new Map();
  intentMap.set("Default Welcome Intent", welcome);
  // You will need to declare this `Login` intent in DialogFlow to make this work
  intentMap.set("Login", login);
  intentMap.set("category", categories);
  intentMap.set("tags", tags);
  intentMap.set("Cart", cart);
  intentMap.set("productInfo", productInfo);
  intentMap.set("NavigationHome", navigationHome);
  intentMap.set("NavigationCart", navigationCart);
  intentMap.set("NavigationCategory", navigationCategory);
  intentMap.set("CartReview", CartReview);
  intentMap.set("CartConfirm", CartConfirm);
  intentMap.set("AddCart", AddCart);
  intentMap.set("DeleteCart", DeleteCart);
  intentMap.set("ClearCart", ClearCart);
  intentMap.set("AddTags", AddTags);
  intentMap.set("DeleteTags", DeleteTags);

  agent.handleRequest(intentMap);
}
);

app.listen(process.env.PORT || 8080);
