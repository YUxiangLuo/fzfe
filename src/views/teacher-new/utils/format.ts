/**
 * Format a date string to YYYY-MM-DD.
 */
export const formatDate = (value: string | null | undefined): string => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Format a date string to locale datetime (zh-CN).
 */
export const formatDateTime = (value: string | null | undefined): string => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('zh-CN');
};

/**
 * Format seconds to a human-readable duration string.
 */
export const formatDuration = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '—';
    const rounded = Math.max(1, Math.round(seconds));
    const hours = Math.floor(rounded / 3600);
    const minutes = Math.floor((rounded % 3600) / 60);
    const secs = rounded % 60;

    if (hours > 0) {
        return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`;
    }
    if (minutes > 0) {
        return secs > 0 ? `${minutes}分钟${secs}秒` : `${minutes}分钟`;
    }
    return `${secs}秒`;
};
