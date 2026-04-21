import React, { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Plus, X, Image as ImageIcon, Music } from 'lucide-react';
import { Asset } from '../../types';

export function AssetNode({ data, id }: NodeProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const allAssets = (data.allAssets || []) as Asset[];
  const selectedAssetIds = (data.selectedAssetIds || []) as string[];
  
  const selectedAssets = selectedAssetIds
    .map(assetId => allAssets.find(a => a.id === assetId))
    .filter(Boolean) as Asset[];

  const handleAddAsset = (assetId: string) => {
    const newSelected = [...selectedAssetIds, assetId];
    if (data.onChange) {
      (data.onChange as any)(id, { selectedAssetIds: newSelected });
    }
    setIsDropdownOpen(false);
  };

  const handleRemoveAsset = (assetId: string) => {
    const newSelected = selectedAssetIds.filter(id => id !== assetId);
    if (data.onChange) {
      (data.onChange as any)(id, { selectedAssetIds: newSelected });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-neutral-200 w-[300px] flex flex-col font-sans relative group">
      <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 bg-neutral-300 border-2 border-white" />
      <Handle type="target" position={Position.Left} id="left" className="w-3 h-3 bg-neutral-300 border-2 border-white" />
      
      <div className="p-2 border-b border-neutral-100 bg-neutral-50 rounded-t-xl text-xs font-medium text-neutral-600 text-center drag-handle cursor-move">
        {(data.title as string) || '资产框'}
      </div>
      
      <div className="p-3 flex-1 flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          {selectedAssets.map(asset => (
            <div key={asset.id} className="relative group/asset rounded-md overflow-hidden bg-neutral-100 aspect-square border border-neutral-200 flex items-center justify-center">
              {asset.type === 'image' ? (
                <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
              ) : (
                <Music className="w-5 h-5 text-neutral-400" />
              )}
              <button
                onClick={() => handleRemoveAsset(asset.id)}
                className="absolute top-1 right-1 w-5 h-5 bg-red-500/80 hover:bg-red-500 text-white rounded flex items-center justify-center opacity-0 group-hover/asset:opacity-100 transition-opacity border-none cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full py-2 bg-neutral-50 border border-neutral-200 border-dashed rounded-md text-[12px] text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> 添加资产
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-md shadow-lg z-50 max-h-[200px] overflow-y-auto">
              {allAssets.length === 0 ? (
                <div className="p-3 text-center text-[11px] text-neutral-400">
                  资产库为空
                </div>
              ) : (
                allAssets.map(asset => {
                  const isSelected = selectedAssetIds.includes(asset.id);
                  if (isSelected) return null;
                  return (
                    <div
                      key={asset.id}
                      onClick={() => handleAddAsset(asset.id)}
                      className="p-2 border-b border-neutral-50 hover:bg-neutral-50 cursor-pointer flex items-center gap-2 last:border-b-0"
                    >
                      <div className="w-6 h-6 rounded bg-neutral-100 overflow-hidden flex items-center justify-center shrink-0">
                        {asset.type === 'image' ? (
                          <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                        ) : (
                          <Music className="w-3 h-3 text-neutral-400" />
                        )}
                      </div>
                      <span className="text-[11px] text-neutral-600 truncate flex-1">{asset.name}</span>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} id="right" className="w-3 h-3 bg-neutral-300 border-2 border-white" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-3 h-3 bg-neutral-300 border-2 border-white" />
    </div>
  );
}
