function asBool(value, defaultValue = false) {
  if (value == null) return defaultValue;
  const raw = String(value).trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

const features = {
  cookieAuth: asBool(process.env.FEATURE_COOKIE_AUTH, false),
  strictExamSession: asBool(process.env.FEATURE_STRICT_EXAM_SESSION, true),
  timeoutAutoClose: asBool(process.env.FEATURE_TIMEOUT_AUTO_CLOSE, false),
  softDeleteUsers: asBool(process.env.FEATURE_SOFT_DELETE_USERS, true),
};

module.exports = { features };
