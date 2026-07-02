import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AcademicTerm, Class } from '../types';
import { isAbortError, getErrorMessage } from './error';
import { listAcademicTerms, listManagedClasses } from './portalApi';

export const formatAcademicTermLabel = (term: Pick<AcademicTerm, 'academic_year' | 'semester' | 'term_label'>): string => {
    return term.term_label || `${term.academic_year} 第${term.semester}学期`;
};

export const getClassDisplayName = (classInfo: Pick<Class, 'class_name' | 'term_label'>): string => {
    return `${classInfo.class_name}（${classInfo.term_label}）`;
};

export function useTermManagedClasses() {
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
    const [classes, setClasses] = useState<Class[]>([]);
    const [isLoadingTerms, setIsLoadingTerms] = useState(true);
    const [isLoadingClasses, setIsLoadingClasses] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        const fetchTerms = async () => {
            setIsLoadingTerms(true);
            setError(null);
            try {
                const data = await listAcademicTerms({ signal: controller.signal });
                if (controller.signal.aborted) return;
                const termList = data || [];
                setTerms(termList);
                const currentTerm = termList.find((term) => Boolean(term.is_active)) ?? termList[0] ?? null;
                setSelectedTermId(currentTerm?.term_id ?? null);
            } catch (err: unknown) {
                if (isAbortError(err)) return;
                if (!controller.signal.aborted) {
                    setError(getErrorMessage(err, '获取学年学期失败'));
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoadingTerms(false);
                }
            }
        };

        fetchTerms();
        return () => { controller.abort(); };
    }, []);

    const reloadClasses = useCallback(async (signal?: AbortSignal) => {
        if (!selectedTermId) {
            setClasses([]);
            setIsLoadingClasses(false);
            return;
        }

        setIsLoadingClasses(true);
        setError(null);
        try {
            const data = await listManagedClasses({ signal, termId: selectedTermId });
            if (signal?.aborted) return;
            setClasses(data || []);
        } catch (err: unknown) {
            if (isAbortError(err)) return;
            if (!signal?.aborted) {
                setError(getErrorMessage(err, '获取班级列表失败'));
                setClasses([]);
            }
        } finally {
            if (!signal?.aborted) {
                setIsLoadingClasses(false);
            }
        }
    }, [selectedTermId]);

    useEffect(() => {
        const controller = new AbortController();
        reloadClasses(controller.signal);
        return () => { controller.abort(); };
    }, [reloadClasses]);

    const selectedTerm = useMemo(
        () => terms.find((term) => term.term_id === selectedTermId) ?? null,
        [terms, selectedTermId],
    );

    return {
        terms,
        selectedTerm,
        selectedTermId,
        setSelectedTermId,
        classes,
        setClasses,
        reloadClasses,
        isLoadingTerms,
        isLoadingClasses,
        isLoading: isLoadingTerms || isLoadingClasses,
        error,
    };
}
