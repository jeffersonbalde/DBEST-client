const ROLE_HOME_ROUTES = {
  property_custodian: "/custodian",
  teacher: "/faculty",
  ict: "/dashboard",
  accounting: "/finance",
};

export const getRoleHomeRoute = (userType) => {
  return ROLE_HOME_ROUTES[userType] || "/login";
};

export default ROLE_HOME_ROUTES;

