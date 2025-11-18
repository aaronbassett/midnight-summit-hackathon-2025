import { Check, ChevronDown, ChevronUp, Copy, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PROVIDER_LABELS, type LLMProvider } from '../../lib/llm/types';
import { supabase } from '../../lib/supabase/client';
import type { Database } from '../../lib/supabase/types';
import { toast } from '../../lib/utils/toast';
import { useMutationsStore } from '../../stores/mutationsStore';
import ApplyMutationsDialog from '../mutations/ApplyMutationsDialog';
import MutatedVariationCard from '../mutations/MutatedVariationCard';

type GeneratedVariation = Database['public']['Tables']['generated_variations']['Row'];

interface VariationCardProps {
  variation: GeneratedVariation;
}

export default function VariationCard({ variation }: VariationCardProps) {
  const [copied, setCopied] = useState(false);
  const [showMutationsDialog, setShowMutationsDialog] = useState(false);
  const [showMutations, setShowMutations] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(variation.prompt_text || '');
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { mutations, fetchMutationsByVariationId } = useMutationsStore();

  // Filter mutations for this variation
  const variationMutations = mutations.filter((m) => m.variation_id === variation.id);

  useEffect(() => {
    // Fetch mutations when the card is expanded
    if (showMutations) {
      fetchMutationsByVariationId(variation.id);
    }
  }, [showMutations, variation.id, fetchMutationsByVariationId]);

  // Update edited text when variation changes
  useEffect(() => {
    setEditedText(variation.prompt_text || '');
  }, [variation.prompt_text]);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!isEditing) return;

    // Don't save if text hasn't changed
    if (editedText === variation.prompt_text) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);

    const { error } = await supabase
      .from('generated_variations')
      .update({ prompt_text: editedText })
      .eq('id', variation.id);

    setIsSaving(false);

    if (error) {
      toast.error('Failed to save changes');
      setEditedText(variation.prompt_text || '');
    } else {
      toast.success('Changes saved successfully');
    }

    setIsEditing(false);
  };

  // Handle click outside to save
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isEditing &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        handleSaveEdit();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, editedText, variation.prompt_text, variation.id]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(variation.prompt_text || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteMutation = async (mutationId: string) => {
    const { error } = await supabase
      .from('mutated_variations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', mutationId);

    if (error) {
      toast.error('Failed to delete mutation');
      return;
    }

    toast.success('Mutation deleted successfully');
    // Refresh mutations
    fetchMutationsByVariationId(variation.id);
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'anthropic':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'gemini':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium border ${getProviderColor(variation.provider)}`}
            >
              {PROVIDER_LABELS[variation.provider as LLMProvider]}
            </span>
            <span className="text-gray-500 text-xs">{variation.model}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMutationsDialog(true)}
              className="px-3 py-1.5 bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500/20 transition-colors border border-purple-500/20 flex items-center gap-2 text-xs"
              title="Apply mutations"
            >
              <Sparkles size={14} />
              Mutate
            </button>
            <button
              onClick={handleCopy}
              className="text-gray-400 hover:text-white transition-colors"
              title="Copy to clipboard"
            >
              {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
            </button>
          </div>
        </div>

        {/* Generated Text */}
        <div
          ref={containerRef}
          className="bg-black border border-gray-800 rounded-lg p-4 mb-4"
          onDoubleClick={handleDoubleClick}
        >
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full min-h-[100px] bg-transparent text-gray-300 text-sm leading-relaxed resize-y focus:outline-hidden border-hidden p-0"
              disabled={isSaving}
            />
          ) : (
            <p
              className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap cursor-text"
              title="Double-click to edit"
            >
              {variation.prompt_text}
            </p>
          )}
          {isSaving && (
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <div className="animate-spin h-3 w-3 border-2 border-gray-500 border-t-transparent rounded-full" />
              Saving...
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Generated {new Date(variation.created_at).toLocaleDateString()}</span>
          <div className="flex items-center gap-4">
            {variationMutations.length > 0 && (
              <button
                onClick={() => setShowMutations(!showMutations)}
                className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
              >
                {variationMutations.length} mutation{variationMutations.length !== 1 ? 's' : ''}
                {showMutations ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
            <span className="font-mono">{variation.id.slice(0, 8)}</span>
          </div>
        </div>

        {/* Mutated Variations */}
        {showMutations && variationMutations.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-800">
            <h4 className="text-sm font-medium text-purple-400 mb-3">Mutated Variations</h4>
            <div className="space-y-3">
              {variationMutations.map((mutation) => (
                <MutatedVariationCard
                  key={mutation.id}
                  mutation={mutation}
                  originalText={variation.generated_text || undefined}
                  onDelete={handleDeleteMutation}
                  showComparison={false}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mutations Dialog */}
      {showMutationsDialog && (
        <ApplyMutationsDialog
          variationId={variation.id}
          variationText={variation.generated_text || ''}
          onClose={() => setShowMutationsDialog(false)}
          onSuccess={() => {
            // Refresh mutations
            fetchMutationsByVariationId(variation.id);
            setShowMutations(true);
          }}
        />
      )}
    </>
  );
}
