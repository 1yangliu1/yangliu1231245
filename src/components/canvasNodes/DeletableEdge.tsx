import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, EdgeProps } from '@xyflow/react';

export function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetPosition,
    targetX,
    targetY,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button
            className="w-5 h-5 bg-white hover:bg-red-500 text-neutral-400 hover:text-white rounded-full flex items-center justify-center cursor-pointer border border-neutral-200 shadow-sm"
            style={{ fontSize: '12px', lineHeight: '1' }}
            onClick={(e) => {
              e.stopPropagation();
              data?.onDelete && (data.onDelete as any)(id);
            }}
          >
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
