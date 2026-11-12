import { shallowRef } from "vue";

const user = shallowRef(null);
let initialized = false;
let initializePromise = null;

const setUser = (nextUser) => {
  user.value = nextUser && typeof nextUser === "object" && "user" in nextUser ? nextUser.user : nextUser;
  initialized = true;
};

const clearUser = () => {
  user.value = null;
  initialized = true;
};

const initialize = (fetchUser) => {
  if (initialized) return Promise.resolve();
  if (!initializePromise) {
    initializePromise = fetchUser()
      .then((result) => setUser(result.data?.user ?? result.data))
      .catch(() => clearUser())
      .finally(() => { initializePromise = null; });
  }
  return initializePromise;
};

export default {
  user,
  isLogin: () => Boolean(user.value),
  setUser,
  clearUser,
  initialize,
};

