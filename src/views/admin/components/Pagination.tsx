import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) {
    return null;
  }

  const buttonClass = "px-4 py-2 text-sm font-medium text-gray-600 bg-white rounded-lg border border-gray-300 hover:bg-gray-100 disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400 transition-colors";

  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className={buttonClass}
        >
          第一页
        </button>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`${buttonClass} flex items-center space-x-2`}
        >
          <ChevronLeft size={16} />
          <span>上一页</span>
        </button>
        <div className="text-sm text-gray-700">
          第 <span className="font-bold">{currentPage}</span> 页 / 共 <span className="font-bold">{totalPages}</span> 页
        </div>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`${buttonClass} flex items-center space-x-2`}
        >
          <span>下一页</span>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={buttonClass}
        >
          最后一页
        </button>
      </div>
    </div>
  );
};

export default Pagination;
