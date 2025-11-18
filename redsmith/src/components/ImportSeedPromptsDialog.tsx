import { AlertCircle, CheckCircle, Upload, X, XCircle } from 'lucide-react';
import { useRef, useState } from 'react';
import { supabase } from '../lib/supabase/client';
import type { Database } from '../lib/supabase/types';

type SeedPromptInsert = Database['public']['Tables']['seed_prompts']['Insert'];

interface ImportSeedPromptsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ index: number; title: string; error: string }>;
}

interface ImportPrompt {
  title: string;
  description: string;
  prompt: string;
  type: 'wallet_attack' | 'benign' | 'ambiguous';
  goal: 'drain_funds' | 'approve_spender' | 'swap' | 'test';
  attack_vector: 'injection' | 'direct_request' | 'roleplay' | 'multi_turn';
  obfuscation_level: 'none' | 'low' | 'medium' | 'high';
  requires_tool?: boolean;
}

export default function ImportSeedPromptsDialog({
  isOpen,
  onClose,
  onSuccess,
}: ImportSeedPromptsDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const validatePrompt = (prompt: unknown): { valid: boolean; error?: string } => {
    if (!prompt || typeof prompt !== 'object') {
      return { valid: false, error: 'Invalid object format' };
    }

    const p = prompt as Partial<ImportPrompt>;

    // Check required fields
    if (!p.title || typeof p.title !== 'string') {
      return { valid: false, error: 'Missing or invalid title' };
    }
    if (!p.description || typeof p.description !== 'string') {
      return { valid: false, error: 'Missing or invalid description' };
    }
    if (!p.prompt || typeof p.prompt !== 'string') {
      return { valid: false, error: 'Missing or invalid prompt' };
    }

    // Validate enum values
    const validTypes = ['wallet_attack', 'benign', 'ambiguous'];
    if (!p.type || !validTypes.includes(p.type)) {
      return { valid: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` };
    }

    const validGoals = ['drain_funds', 'approve_spender', 'swap', 'test'];
    if (!p.goal || !validGoals.includes(p.goal)) {
      return { valid: false, error: `Invalid goal. Must be one of: ${validGoals.join(', ')}` };
    }

    const validAttackVectors = ['injection', 'direct_request', 'roleplay', 'multi_turn', 'none'];
    if (!p.attack_vector || !validAttackVectors.includes(p.attack_vector)) {
      return {
        valid: false,
        error: `Invalid attack_vector. Must be one of: ${validAttackVectors.join(', ')}`,
      };
    }

    const validObfuscationLevels = ['none', 'low', 'medium', 'high'];
    if (!p.obfuscation_level || !validObfuscationLevels.includes(p.obfuscation_level)) {
      return {
        valid: false,
        error: `Invalid obfuscation_level. Must be one of: ${validObfuscationLevels.join(', ')}`,
      };
    }

    return { valid: true };
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setResult(null);

    try {
      // Read file content
      const fileContent = await file.text();
      let prompts: unknown;

      try {
        prompts = JSON.parse(fileContent);
      } catch {
        setResult({
          total: 0,
          successful: 0,
          failed: 0,
          errors: [{ index: 0, title: 'File', error: 'Invalid JSON format' }],
        });
        setIsProcessing(false);
        return;
      }

      // Validate that it's an array
      if (!Array.isArray(prompts)) {
        setResult({
          total: 0,
          successful: 0,
          failed: 0,
          errors: [{ index: 0, title: 'File', error: 'JSON must contain an array of prompts' }],
        });
        setIsProcessing(false);
        return;
      }

      if (prompts.length === 0) {
        setResult({
          total: 0,
          successful: 0,
          failed: 0,
          errors: [{ index: 0, title: 'File', error: 'No prompts found in array' }],
        });
        setIsProcessing(false);
        return;
      }

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setResult({
          total: 0,
          successful: 0,
          failed: 0,
          errors: [{ index: 0, title: 'Auth', error: 'User not authenticated' }],
        });
        setIsProcessing(false);
        return;
      }

      // Process each prompt
      const errors: Array<{ index: number; title: string; error: string }> = [];
      let successful = 0;

      for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i];
        const validation = validatePrompt(prompt);

        if (!validation.valid) {
          const p = prompt as Partial<ImportPrompt>;
          errors.push({
            index: i + 1,
            title: p.title || `Prompt ${i + 1}`,
            error: validation.error || 'Unknown error',
          });
          continue;
        }

        // Create the prompt
        const p = prompt as ImportPrompt;
        const insertData: SeedPromptInsert = {
          user_id: user.id,
          title: p.title,
          description: p.description,
          prompt_text: p.prompt,
          type: p.type,
          goal: p.goal,
          attack_vector: p.attack_vector,
          obfuscation_level: p.obfuscation_level,
          requires_tool: p.requires_tool ?? false,
        };

        const { error } = await supabase.from('seed_prompts').insert(insertData);

        if (error) {
          errors.push({
            index: i + 1,
            title: p.title,
            error: error.message,
          });
        } else {
          successful++;
        }
      }

      setResult({
        total: prompts.length,
        successful,
        failed: errors.length,
        errors,
      });

      // If all successful, trigger refresh
      if (successful > 0) {
        onSuccess();
      }
    } catch (error) {
      setResult({
        total: 0,
        successful: 0,
        failed: 0,
        errors: [
          {
            index: 0,
            title: 'System',
            error: error instanceof Error ? error.message : 'Unknown error occurred',
          },
        ],
      });
    } finally {
      setIsProcessing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Upload className="text-cyan-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Import Seed Prompts</h2>
              <p className="text-gray-400 text-sm">Upload a JSON file with seed prompts</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isProcessing}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* File input */}
          {!result && (
            <div>
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-700 border-dashed rounded-lg cursor-pointer bg-black hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 mb-3 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-300">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">JSON file with array of seed prompts</p>
                </div>
                <input
                  ref={fileInputRef}
                  id="file-upload"
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isProcessing}
                />
              </label>
            </div>
          )}

          {/* Processing indicator */}
          {isProcessing && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-black border border-gray-700 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-white">{result.total}</div>
                    <div className="text-gray-400 text-sm">Total</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-400">{result.successful}</div>
                    <div className="text-gray-400 text-sm">Successful</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-400">{result.failed}</div>
                    <div className="text-gray-400 text-sm">Failed</div>
                  </div>
                </div>
              </div>

              {/* Success message */}
              {result.successful > 0 && result.failed === 0 && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-start gap-3">
                  <CheckCircle className="text-green-400 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="text-green-400 font-medium">Import Successful</p>
                    <p className="text-green-300/70 text-sm mt-1">
                      All {result.successful} seed prompts were imported successfully.
                    </p>
                  </div>
                </div>
              )}

              {/* Partial success message */}
              {result.successful > 0 && result.failed > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="text-yellow-400 font-medium">Partial Import</p>
                    <p className="text-yellow-300/70 text-sm mt-1">
                      {result.successful} prompts imported, {result.failed} failed. See errors
                      below.
                    </p>
                  </div>
                </div>
              )}

              {/* Complete failure message */}
              {result.successful === 0 && result.failed > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
                  <XCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="text-red-400 font-medium">Import Failed</p>
                    <p className="text-red-300/70 text-sm mt-1">
                      No prompts were imported. See errors below.
                    </p>
                  </div>
                </div>
              )}

              {/* Error list */}
              {result.errors.length > 0 && (
                <div>
                  <h3 className="text-white font-medium mb-3">Errors ({result.errors.length})</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {result.errors.map((error, idx) => (
                      <div
                        key={idx}
                        className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-red-400 font-mono text-xs">#{error.index}</span>
                          <div className="flex-1">
                            <p className="text-red-300 font-medium text-sm">{error.title}</p>
                            <p className="text-red-400/70 text-xs mt-1">{error.error}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Import another file button */}
              <button
                onClick={() => {
                  setResult(null);
                  fileInputRef.current?.click();
                }}
                className="w-full py-3 bg-gray-800 text-gray-300 font-semibold rounded-lg hover:bg-gray-700 transition-colors"
              >
                Import Another File
              </button>
            </div>
          )}

          {/* Instructions */}
          {!result && !isProcessing && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h3 className="text-blue-400 font-medium mb-2">JSON Format</h3>
              <p className="text-blue-300/70 text-sm mb-3">
                The JSON file should contain an array of objects with the following properties:
              </p>
              <pre className="bg-black border border-gray-700 rounded p-3 text-xs text-gray-300 overflow-x-auto">
                {`[
  {
    "title": "string",
    "description": "string",
    "prompt": "string",
    "type": "wallet_attack" | "benign" | "ambiguous",
    "goal": "drain_funds" | "approve_spender" | "swap" | "test",
    "attack_vector": "injection" | "direct_request" | "roleplay" | "multi_turn",
    "obfuscation_level": "none" | "low" | "medium" | "high",
    "requires_tool": boolean (optional, defaults to false)
  }
]`}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-4 p-6 border-t border-gray-800">
          <button
            onClick={handleClose}
            className="px-6 py-3 text-gray-400 font-semibold hover:text-white transition-colors"
            disabled={isProcessing}
          >
            {result ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
