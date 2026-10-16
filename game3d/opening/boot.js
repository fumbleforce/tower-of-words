const q=new URLSearchParams(location.search);(q.has("film")||q.has("embed"))&&!q.has("live")?import("./film.js"):import("./op.js");
