// Story condition compilation is shared by runtime evaluation and authoring checks.
// Preserve the existing JavaScript expression semantics and identifier substitution.
export const allowedConditionCharacters = (expr) => /^[\w\s!&|()<>=.'"+-]*$/.test(expr);

export function compileCondition(expr) {
  const flags = new Set();
  // Keep replacement outside the compilation catch: non-string inputs historically throw.
  const js = expr.replace(/'[^']*'|"[^"]*"|\b[A-Za-z_]\w*\b/g, (m) => {
    if (/^['"]/.test(m) || m === 'true' || m === 'false') return m;
    flags.add(m);
    return `F(${JSON.stringify(m)})`;
  });
  try {
    return { evaluate: new Function('F', `return (${js});`), flags: [...flags] };
  } catch (error) {
    return { error, flags: [...flags] };
  }
}

export function createConditionEvaluator(lookup) {
  const cache = new Map();
  return function cond(expr) {
    if (expr === undefined || expr === null || expr === true) return true;
    if (expr === false) return false;
    let f = cache.get(expr);
    if (!f) {
      if (!allowedConditionCharacters(expr)) {
        console.warn('bad condition', expr);
        return false;
      }
      const compiled = compileCondition(expr);
      if (compiled.error) {
        console.warn('bad condition', expr, compiled.error);
        f = () => false;
      } else f = compiled.evaluate;
      cache.set(expr, f);
    }
    try {
      return !!f(lookup);
    } catch {
      return false;
    }
  };
}
