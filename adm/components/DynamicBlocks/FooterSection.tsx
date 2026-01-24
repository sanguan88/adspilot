"use client"

import type { Block } from "@/types/page-builder"
import Link from "next/link"

interface FooterSectionProps {
    block: Block
    isPreview?: boolean
}

export function FooterSection({ block, isPreview = false }: FooterSectionProps) {
    const {
        tagline = "Platform otomasi iklan terbaik untuk seller Shopee di Indonesia.",
        column1Title = "Produk",
        column1Links = "Fitur|#fitur,Harga|#harga,Testimoni|#testimoni",
        column2Title = "Perusahaan",
        column2Links = "FAQ|#faq,Tentang Kami|#,Blog|#",
        column3Title = "Support",
        column3Links = "Hubungi Kami|#,Privacy Policy|#,Terms of Service|#",
        copyright = "© 2026 AdsPilot. All rights reserved.",
    } = block.components

    // Parse links: "label|url,label|url" format
    const parseLinks = (linksStr: string | string[]) => {
        if (Array.isArray(linksStr)) return linksStr as any[]
        if (typeof linksStr !== 'string') return []
        return linksStr.split(',').map(link => {
            const [label, url] = link.split('|')
            return { label: label?.trim(), url: url?.trim() || '#' }
        })
    }

    const col1Links = parseLinks(column1Links as string)
    const col2Links = parseLinks(column2Links as string)
    const col3Links = parseLinks(column3Links as string)

    return (
        <footer className="bg-foreground text-primary-foreground py-8 sm:py-12">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                <div className="grid md:grid-cols-4 gap-8 mb-8">
                    {/* Logo & Tagline */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <img
                                src="/adspilot.png"
                                alt="ADSPILOT Logo"
                                className="h-8 w-auto object-contain brightness-0 invert"
                            />
                        </div>
                        <p className="text-sm opacity-75">
                            {tagline as string}
                        </p>
                    </div>

                    {/* Column 1 */}
                    <div>
                        <h4 className="font-semibold mb-4">{column1Title as string}</h4>
                        <ul className="space-y-2 text-sm opacity-75">
                            {col1Links.map((link, idx) => (
                                <li key={idx}>
                                    {isPreview ? (
                                        <span className="hover:opacity-100 transition-opacity cursor-pointer">
                                            {link.label}
                                        </span>
                                    ) : (
                                        <Link href={link.url} className="hover:opacity-100 transition-opacity">
                                            {link.label}
                                        </Link>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 2 */}
                    <div>
                        <h4 className="font-semibold mb-4">{column2Title as string}</h4>
                        <ul className="space-y-2 text-sm opacity-75">
                            {col2Links.map((link, idx) => (
                                <li key={idx}>
                                    {isPreview ? (
                                        <span className="hover:opacity-100 transition-opacity cursor-pointer">
                                            {link.label}
                                        </span>
                                    ) : (
                                        <Link href={link.url} className="hover:opacity-100 transition-opacity">
                                            {link.label}
                                        </Link>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 3 */}
                    <div>
                        <h4 className="font-semibold mb-4">{column3Title as string}</h4>
                        <ul className="space-y-2 text-sm opacity-75">
                            {col3Links.map((link, idx) => (
                                <li key={idx}>
                                    {isPreview ? (
                                        <span className="hover:opacity-100 transition-opacity cursor-pointer">
                                            {link.label}
                                        </span>
                                    ) : (
                                        <Link href={link.url} className="hover:opacity-100 transition-opacity">
                                            {link.label}
                                        </Link>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Copyright */}
                <div className="border-t border-primary-foreground/20 pt-8 text-center text-sm opacity-75">
                    <p>{copyright as string}</p>
                </div>
            </div>
        </footer>
    )
}
