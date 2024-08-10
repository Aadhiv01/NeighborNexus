const initialState = {
    isLoggedIn: false,
    user: {},
  };
  
  const userReducer = (state = initialState, action) => {
    switch (action.type) {
      case 'LOGIN':
        return {
          ...state,
          isLoggedIn: true,
          user: action.payload,
        };
      case 'LOGOUT':
        return {
          ...state,
          isLoggedIn: false,
          user: {},
        };
      default:
        return state;
    }
  };
  
  export default userReducer;