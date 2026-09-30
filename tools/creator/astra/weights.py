"""Bind upper garment surfaces to the same local body deformation as the skin below."""
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform

def upper_garment(obj, body_obj, body_mesh, H, limit=None):
    points=[v.co.copy() for v in body_obj.data.vertices]
    triangles=[]
    for poly,tag in zip(body_obj.data.polygons,body_mesh.tags):
        if tag!='skin' or min(points[i].z/H for i in poly.vertices)<.37 or max(points[i].z/H for i in poly.vertices)>.535:continue
        ids=list(poly.vertices)
        triangles.extend((ids[0],ids[i],ids[i+1]) for i in range(1,len(ids)-1))
    tree=BVHTree.FromPolygons(points,triangles,all_triangles=True)
    names={g.index:g.name for g in body_obj.vertex_groups}
    for v in obj.data.vertices:
        if (limit is not None and v.index>=limit) or not .405<v.co.z/H<.521:continue
        loc,normal,index,distance=tree.find_nearest(v.co)
        ids=triangles[index]
        bary=barycentric_transform(loc,*[points[i] for i in ids],Vector((1,0,0)),Vector((0,1,0)),Vector((0,0,1)))
        weights={}
        for i,w in zip(ids,bary):
            for g in body_obj.data.vertices[i].groups:
                name=names[g.group];weights[name]=weights.get(name,0)+max(0,w)*g.weight
        total=sum(weights.values())
        if not total:raise ValueError('Unweighted upper garment sample')
        for g in obj.vertex_groups:g.remove([v.index])
        for name,w in weights.items():
            if w/total<.0001:continue
            group=obj.vertex_groups.get(name) or obj.vertex_groups.new(name=name)
            group.add([v.index],w/total,'REPLACE')


def normalize_four(obj):
    """Bake the runtime's four strongest influences into the authoring mesh too."""
    for v in obj.data.vertices:
        weights=sorted([(g.group,g.weight) for g in v.groups],key=lambda g:g[1],reverse=True)
        keep=weights[:4];total=sum(w for _,w in keep)
        if not total:raise ValueError(f'Unweighted vertex {obj.name}:{v.index}')
        for index,_ in weights:obj.vertex_groups[index].remove([v.index])
        for index,w in keep:obj.vertex_groups[index].add([v.index],w/total,'REPLACE')
