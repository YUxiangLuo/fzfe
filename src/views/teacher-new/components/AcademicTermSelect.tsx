import React from 'react';
import { Select, Space, Typography } from 'antd';
import type { SelectProps } from 'antd';
import type { AcademicTerm } from '../types';
import { formatAcademicTermLabel } from '../utils/useTermManagedClasses';

const { Text } = Typography;

interface AcademicTermSelectProps {
    terms: AcademicTerm[];
    value: number | null;
    onChange: (value: number) => void;
    loading?: boolean;
    size?: SelectProps['size'];
    width?: number;
}

const AcademicTermSelect: React.FC<AcademicTermSelectProps> = ({
    terms,
    value,
    onChange,
    loading = false,
    size,
    width = 220,
}) => {
    return (
        <Space>
            <Text strong>学年/学期</Text>
            <Select
                value={value ?? undefined}
                onChange={onChange}
                loading={loading}
                size={size}
                style={{ width }}
                placeholder="请选择学年/学期"
                options={terms.map((term) => ({
                    value: term.term_id,
                    label: term.is_active ? `${formatAcademicTermLabel(term)}（当前）` : formatAcademicTermLabel(term),
                }))}
            />
        </Space>
    );
};

export default AcademicTermSelect;
