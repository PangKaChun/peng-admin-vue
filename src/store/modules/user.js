import { login, h4aLogin, logout, getInfo } from "@/api/login";
import { getToken, setToken, removeToken, getRefreshToken, setRefreshToken, removeRefreshToken } from "@/utils/auth";
import store from "@/store";

const user = {
  namespaced: true,

  state: {
    token: getToken(),
    refreshToken: getRefreshToken(),
    name: "",
    avatar: "",
    roles: [],
    permissions: [],
    userInfo: {}
  },

  mutations: {
    SET_TOKEN: (state, token) => {
      state.token = token;
    },
    SET_REFRESH_TOKEN: (state, refreshToken) => {
      state.refreshToken = refreshToken;
    },
    SET_NAME: (state, name) => {
      state.name = name;
    },
    SET_AVATAR: (state, avatar) => {
      state.avatar = avatar;
    },
    SET_ROLES: (state, roles) => {
      state.roles = roles;
    },
    SET_PERMISSIONS: (state, permissions) => {
      state.permissions = permissions;
    },
    SET_USER_INFO: (state, userInfo) => {
      state.userInfo = userInfo;
    }
  },

  actions: {
    // 登录
    Login({ commit }, userInfo) {
      const username = userInfo.username.trim();
      const password = userInfo.password;
      const randomCode = userInfo.randomCode;
      const captcha = userInfo.captcha;
      return new Promise((resolve, reject) => {
        login(username, password, randomCode, captcha)
          .then((res) => {
            let token = res.data.access_token;
            if (token) {
              store.dispatch("user/setToken", token);
              setToken(token);
            }
            let refreshToken = res.data.refresh_token;
            if (refreshToken) {
              store.dispatch("user/setRefreshToken", refreshToken);
              setRefreshToken(refreshToken);
            }
            resolve();
          })
          .catch((error) => {
            reject(error);
          });
      });
    },

    // 获取用户信息
    GetInfo({ commit, state }) {
      return new Promise((resolve, reject) => {
        getInfo()
          .then((res) => {
            const { user, casUser, roles, permissions, places} = res;
            const avatar =
              user.avatar == "" || user.avatar == null
                ? require("@/assets/images/preview.png")
                : process.env.VUE_APP_BASE_API + user.avatar;
            if (roles && roles.length > 0) {
              // 验证返回的roles是否是一个非空数组
              commit("SET_ROLES", roles);
              commit("SET_PERMISSIONS", permissions);
            }
            commit("SET_USER_INFO", Object.assign(user, casUser));
            commit("SET_NAME", user.username);
            commit("SET_AVATAR", avatar);
            resolve(res);
          })
          .catch((error) => {
            reject(error);
          });
      });
    },
    // 退出系统
    LogOut({ commit, state }) {
      return new Promise((resolve, reject) => {
        logout(state.token)
          .then(() => {
            commit("SET_TOKEN", "");
            commit("SET_ROLES", []);
            commit("SET_PERMISSIONS", []);
            commit("SET_USER_INFO", {});
            removeToken();
            removeRefreshToken();
            resolve();
          })
          .catch((error) => {
            reject(error);
          });
      });
    },
    setToken({ commit }, token) {
      commit("SET_TOKEN", token);
    },
    setRefreshToken({ commit }, refreshToken) {
      commit("SET_REFRESH_TOKEN", refreshToken);
    },
  },
};

export default user;
