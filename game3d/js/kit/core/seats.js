// Furniture records the cushion surface in its own frame before geometry is batched.
export function seatPoint(host, x, z, top, ry = 0, options = {}) {
  const data = host.userData || host;
  (data.seatPoints ||= []).push({ x, z, top, ry, floor: 0, ...options });
  return host;
}
export function seatRow(host, x, z, top, ry, length, options = {}) {
  const count = Math.max(1, Math.floor(length / 0.65));
  for (let i = 0; i < count; i++) {
    const u = (i - (count - 1) / 2) * Math.min(0.72, length / count);
    seatPoint(host, x + Math.cos(ry) * u, z - Math.sin(ry) * u, top, ry, { label: 'Bench', ...options });
  }
}
export function transferSeats(host, root) {
  if (host.seatPoints?.length) (root.userData.seatPoints ||= []).push(...host.seatPoints.splice(0));
}
