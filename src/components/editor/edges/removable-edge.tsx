import { EdgeLabelRenderer, BaseEdge, EdgeProps, getSmoothStepPath, useReactFlow } from "reactflow";
import { X } from "lucide-react";

export function RemovableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  selected,
}: EdgeProps) {
  const { deleteElements } = useReactFlow();
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{ ...style, strokeWidth: selected ? 2.5 : 1.75 }}
      />
      <EdgeLabelRenderer>
        <button
          className="nodrag nopan absolute flex size-4 items-center justify-center rounded-full border bg-card text-muted-foreground/60 shadow-sm hover:border-destructive hover:bg-destructive hover:text-destructive-foreground"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
          onClick={(e) => {
            e.stopPropagation();
            deleteElements({ edges: [{ id }] });
          }}
          title="הסר חיבור"
        >
          <X className="size-2.5" />
        </button>
      </EdgeLabelRenderer>
    </>
  );
}
