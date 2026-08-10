'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Campos de Microsoft Clarity (ID de proyecto + token de la Data Export API), compartidos
 * por el alta y la edición de sitio para que no vuelvan a divergir. El token se guarda
 * cifrado; el placeholder cambia según si ya hay uno conectado.
 */
export function ClarityFields({
    projectId, token, connected, onProject, onToken, idPrefix,
}: {
    projectId: string;
    token: string;
    connected?: boolean;
    onProject: (v: string) => void;
    onToken: (v: string) => void;
    idPrefix: string;
}) {
    return (
        <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3">
            <p className="text-sm font-medium">
                Microsoft Clarity <span className="font-normal text-muted-foreground">· opcional</span>
            </p>
            <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${idPrefix}-clarity-project`}>ID del proyecto</Label>
                <Input
                    id={`${idPrefix}-clarity-project`}
                    placeholder="ej. abcd1234ef"
                    value={projectId}
                    onChange={(e) => onProject(e.target.value)}
                />
            </div>
            <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${idPrefix}-clarity-token`}>
                    Token de la Data Export API
                    {connected && (
                        <span className="ml-2 text-xs font-normal text-emerald-700 dark:text-emerald-400">conectado</span>
                    )}
                </Label>
                <Input
                    id={`${idPrefix}-clarity-token`}
                    type="password"
                    placeholder={connected ? 'Dejalo vacío para no cambiarlo' : 'Pegá el token de Clarity'}
                    value={token}
                    onChange={(e) => onToken(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                    Se genera en Clarity → Settings → Data Export. Se guarda cifrado. Los datos
                    empiezan a juntarse desde que lo conectás (la API no trae historia hacia atrás).
                </p>
            </div>
        </div>
    );
}
