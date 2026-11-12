import auth from "../config/auth.js";
import authApi from "../api/authApi.js";
import { broadcastAuthSignal, AuthSignal } from "../channel/authChannel.js";

export const useAuth = () => ({
  user: auth.user,
  async login(data) {
    const result = await authApi.login(data);
    auth.setUser(result.data.user);
    broadcastAuthSignal(AuthSignal.REFRESH);
    return result.data.user;
  },
  async register(data) {
    const result = await authApi.register(data);
    auth.setUser(result.data.user);
    broadcastAuthSignal(AuthSignal.REFRESH);
    return result.data.user;
  },
  async logout() {
    await authApi.logout();
    auth.clearUser();
    broadcastAuthSignal(AuthSignal.REFRESH);
  },
});
