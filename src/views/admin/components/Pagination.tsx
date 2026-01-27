import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Pagination as UiPagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) {
    return null;
  }

  const isFirst = currentPage === 1;
  const isLast = currentPage === totalPages;

  const handleClick =
    (page: number, disabled: boolean) =>
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      if (!disabled) {
        onPageChange(page);
      }
    };

  const disabledClass = "pointer-events-none opacity-50";

  return (
    <UiPagination>
      <PaginationContent className="w-full items-center justify-between px-2">
        <PaginationItem>
          <PaginationLink
            href="#"
            onClick={handleClick(1, isFirst)}
            aria-disabled={isFirst}
            className={isFirst ? disabledClass : ""}
          >
            第一页
          </PaginationLink>
        </PaginationItem>

        <PaginationItem className="flex items-center gap-3">
          <PaginationLink
            href="#"
            onClick={handleClick(currentPage - 1, isFirst)}
            aria-disabled={isFirst}
            className={`gap-1 px-2.5 ${isFirst ? disabledClass : ""}`}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>上一页</span>
          </PaginationLink>
          <span className="text-sm text-muted-foreground">
            第 <span className="font-semibold text-foreground">{currentPage}</span>{" "}
            页 / 共{" "}
            <span className="font-semibold text-foreground">{totalPages}</span>{" "}
            页
          </span>
          <PaginationLink
            href="#"
            onClick={handleClick(currentPage + 1, isLast)}
            aria-disabled={isLast}
            className={`gap-1 px-2.5 ${isLast ? disabledClass : ""}`}
          >
            <span>下一页</span>
            <ChevronRight className="h-4 w-4" />
          </PaginationLink>
        </PaginationItem>

        <PaginationItem>
          <PaginationLink
            href="#"
            onClick={handleClick(totalPages, isLast)}
            aria-disabled={isLast}
            className={isLast ? disabledClass : ""}
          >
            最后一页
          </PaginationLink>
        </PaginationItem>
      </PaginationContent>
    </UiPagination>
  );
};

export default Pagination;
