// A pool outfit changes a body's animation surface without replacing its actor or walking root.
// Construction samples the new rig at the origin, detached from the place's transforms.
const BODY_KEYS = [
  'rig',
  'chibi',
  'model',
  'mixer',
  'update',
  'sitHip',
  'pose',
  'layers',
  'phone',
  'placePhone',
  'gesture',
  'gestures',
  'setState',
  'setGait',
  'strides',
  'state',
  'sitAt',
  'meshy',
  'legs',
  'knees',
  'arms',
  'torso',
  'hips',
  'head',
  'headK',
  'lap',
  'lean',
  'stepNow',
  'sitHere',
];
const descriptors = (actor) =>
  Object.fromEntries(BODY_KEYS.map((key) => [key, Object.getOwnPropertyDescriptor(actor, key)]));
function install(actor, values) {
  for (const key of BODY_KEYS) {
    if (values[key]) Object.defineProperty(actor, key, values[key]);
    else delete actor[key];
  }
}
export function poolOutfitSlot(actor, make, decorate) {
  const root = actor.root,
    ordinary = descriptors(actor),
    parent = root.parent;
  const position = root.position.clone(),
    quaternion = root.quaternion.clone(),
    scale = root.scale.clone();
  const ordinaryChildren = [...root.children];
  const isBody = (child) => {
    let model = actor.model || actor.rig?.root;
    if (!model) return true;
    while (model && model !== root) {
      if (model === child) return true;
      model = model.parent;
    }
    return child === actor.lap;
  };
  const ordinaryBody = ordinaryChildren.filter(isBody);
  const extras = ordinaryChildren.filter((child) => !ordinaryBody.includes(child));
  let body, outfitChildren;
  try {
    root.removeFromParent();
    for (const child of ordinaryChildren) root.remove(child);
    root.position.set(0, 0, 0);
    root.quaternion.identity();
    root.scale.setScalar(1);
    root.updateMatrixWorld(true);
    body = make(root);
    if (body.root !== root) throw new Error('Pool outfit must retain the existing actor root');
    outfitChildren = [...root.children];
  } finally {
    for (const child of [...root.children]) root.remove(child);
    root.add(...ordinaryChildren);
    root.position.copy(position);
    root.quaternion.copy(quaternion);
    root.scale.copy(scale);
    parent?.add(root);
    root.updateMatrixWorld(true);
  }
  let outfit = descriptors(body),
    active = false,
    decorated = false;
  return {
    get active() {
      return active;
    },
    set(on) {
      on = !!on;
      if (on === active) return;
      if (on) {
        for (const child of ordinaryBody) root.remove(child);
        root.add(...outfitChildren);
        install(actor, outfit);
        if (!decorated) {
          decorate?.(actor);
          outfit = descriptors(actor);
          outfitChildren = root.children.filter((child) => !extras.includes(child));
          decorated = true;
        }
      } else {
        for (const child of outfitChildren) root.remove(child);
        root.add(...ordinaryBody);
        install(actor, ordinary);
      }
      active = on;
      actor._gait = null;
      actor.setState?.('idle');
      actor.update?.(0);
    },
    dispose() {
      this.set(false);
      body.mixer?.stopAllAction();
      for (const child of outfitChildren)
        child.traverse((o) => {
          if (o.isMesh) for (const material of [].concat(o.material || [])) material.dispose();
        });
    },
  };
}
