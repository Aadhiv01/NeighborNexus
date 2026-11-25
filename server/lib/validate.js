/**
 * Validates req.params / req.query / req.body against Zod schemas.
 * On failure it answers 400 with the first message as `msg` (the shape the
 * client already reads) plus the full list as `errors`.
 * Parsed values are in req.valid.{params,query,body}; Express 5 makes
 * req.query read-only, so nothing is written back onto req.
 */
const validate = (schemas) => (req, res, next) => {
  req.valid = {};
  for (const part of ['params', 'query', 'body']) {
    if (!schemas[part]) continue;
    const result = schemas[part].safeParse(req[part] ?? {});
    if (!result.success) {
      const errors = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        msg: i.message,
      }));
      return res.status(400).json({ msg: errors[0].msg, errors });
    }
    req.valid[part] = result.data;
  }
  return next();
};

module.exports = validate;
