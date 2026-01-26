import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

interface PaginationProps {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
    className?: string
}

export function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    className,
}: PaginationProps) {
    const getPageNumbers = () => {
        const pages = []
        const showMax = 5

        if (totalPages <= showMax) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i)
            }
        } else {
            // Logic for ellipsis
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4, "ellipsis", totalPages)
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
            } else {
                pages.push(1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages)
            }
        }
        return pages
    }

    if (totalPages <= 1) return null

    return (
        <nav
            role="navigation"
            aria-label="pagination"
            className={cn("mx-auto flex w-full justify-center", className)}
        >
            <ul className="flex flex-row items-center gap-1">
                <li>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        aria-label="Go to previous page"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                </li>

                {getPageNumbers().map((page, index) => (
                    <li key={index}>
                        {page === "ellipsis" ? (
                            <span className="flex h-9 w-9 items-center justify-center">
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </span>
                        ) : (
                            <Button
                                variant={currentPage === page ? "outline" : "ghost"}
                                size="icon"
                                className={cn(
                                    "h-9 w-9",
                                    currentPage === page && "pointer-events-none border-primary text-primary"
                                )}
                                onClick={() => onPageChange(page as number)}
                            >
                                {page}
                            </Button>
                        )}
                    </li>
                ))}

                <li>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        aria-label="Go to next page"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </li>
            </ul>
        </nav>
    )
}
