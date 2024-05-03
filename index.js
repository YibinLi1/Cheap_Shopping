const API = (() => {
  const URL = "http://localhost:3000";

  const getCart = () => {
    return fetch(`${URL}/cart`).then((response) => response.json());
  };

  const getInventory = () => {
    return fetch(`${URL}/inventory`).then((response) => response.json());
  };

  const addToCart = (inventoryItem) => {
    return fetch(`${URL}/cart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(inventoryItem),
    }).then((response) => response.json());
  };

  const updateCart = (id, newAmount) => {
    return fetch(`${URL}/cart/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: newAmount }),
    }).then((response) => response.json());
  };

  const deleteFromCart = (id) => {
    return fetch(`${URL}/cart/${id}`, {
      method: "DELETE",
    });
  };

  const checkout = () => {
    return getCart().then((data) =>
      Promise.all(data.map((item) => deleteFromCart(item.id)))
    );
  };

  return {
    getCart,
    updateCart,
    getInventory,
    addToCart,
    deleteFromCart,
    checkout,

  };
})();

const Model = (() => {
  class State {
    #onChange;
    #inventory;
    #cart;

    constructor() {
      this.#inventory = [];
      this.#cart = [];
    }

    get cart() {
      return this.#cart;
    }

    get inventory() {
      return this.#inventory;
    }

    set cart(newCart) {
      this.#cart = newCart;
      this.#onChange();
    }

    set inventory(newInventory) {
      this.#inventory = newInventory;
      this.#onChange();
    }

    subscribe(cb) {
      this.#onChange = cb;
    }
  }

  const { getCart, updateCart, getInventory, addToCart, deleteFromCart, checkout } = API;

  return {
    State,
    getCart,
    updateCart,
    getInventory,
    addToCart,
    deleteFromCart,
    checkout,
  };
})();

const View = (() => {
  const inventoryListEl = document.querySelector(".inventory-list");
  const cartListEl = document.querySelector(".cart-list");
  const checkoutBtnEl = document.querySelector(".checkout-btn");

  const renderInventory = (inventory) => {
    let inventoryTemplate = "";
    inventory.forEach((item) => {
      inventoryTemplate += `
        <li>
          <span>${item.content}</span>
          <div class="amount-controls">
            <button class="decrease-btn" data-id="${item.id}">-</button>
            <span>${item.amount || 0}</span>
            <button class="increase-btn" data-id="${item.id}">+</button>
            <button class="add-to-cart-btn" data-id="${item.id}">add to cart</button>
          </div>
        </li>
      `;
    });
    inventoryListEl.innerHTML = inventoryTemplate;
  };

  const renderCart = (cart) => {
    let cartTemplate = "";
    cart.forEach((item) => {
      cartTemplate += `
        <li>
          <span>${item.content}</span>
          <span>x ${item.amount}</span>
          <button class="delete-btn" data-id="${item.id}">Delete</button>
        </li>
      `;
    });
    cartListEl.innerHTML = cartTemplate;
  };

  return {
    inventoryListEl,
    cartListEl,
    checkoutBtnEl,
    renderInventory,
    renderCart,
  };
})();

const Controller = ((model, view) => {
  const state = new model.State();

  const init = () => {
    model.getInventory().then((inventory) => {
      state.inventory = inventory.map((item) => ({ ...item, amount: 0 }));
    });

    model.getCart().then((cart) => {
      state.cart = cart;
    });

    state.subscribe(() => {
      view.renderInventory(state.inventory);
      view.renderCart(state.cart);
    });
  };

  const handleUpdateAmount = () => {
    view.inventoryListEl.addEventListener("click", (event) => {
      if (event.target.classList.contains("decrease-btn")) {
        const id = parseInt(event.target.dataset.id);
        const item = state.inventory.find((item) => item.id === id);
        if (item.amount > 0) {
          item.amount--;
          state.inventory = [...state.inventory];
        }
      } else if (event.target.classList.contains("increase-btn")) {
        const id = parseInt(event.target.dataset.id);
        const item = state.inventory.find((item) => item.id === id);
        item.amount++;
        state.inventory = [...state.inventory];
      }
    });
  };

  const handleAddToCart = () => {
    view.inventoryListEl.addEventListener("click", (event) => {
      if (event.target.classList.contains("add-to-cart-btn")) {
        const id = parseInt(event.target.dataset.id);
        const inventoryItem = state.inventory.find((item) => item.id === id);
        const cartItem = state.cart.find((item) => item.id === id);

        if (inventoryItem.amount > 0) {
          if (cartItem) {
            model.updateCart(id, cartItem.amount + inventoryItem.amount).then((updatedItem) => {
              state.cart = state.cart.map((item) => (item.id === id ? updatedItem : item));
            });
          } else {
            model.addToCart({ ...inventoryItem, amount: inventoryItem.amount }).then((addedItem) => {
              state.cart = [...state.cart, addedItem];
            });
          }
        }
      }
    });
  };

  const handleDelete = () => {
    view.cartListEl.addEventListener("click", (event) => {
      if (event.target.classList.contains("delete-btn")) {
        const id = parseInt(event.target.dataset.id);
        model.deleteFromCart(id).then(() => {
          state.cart = state.cart.filter((item) => item.id !== id);
        });
      }
    });
  };

  const handleCheckout = () => {
    view.checkoutBtnEl.addEventListener("click", () => {
      model.checkout().then(() => {
        state.cart = [];
      });
    });
  };

  const bootstrap = () => {
    init();
    handleUpdateAmount();
    handleAddToCart();
    handleDelete();
    handleCheckout();
  };

  return {
    bootstrap,
  };
})(Model, View);

Controller.bootstrap();
