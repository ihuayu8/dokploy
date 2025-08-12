import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle2, ChevronRight, Globe, LayoutDashboard,
    LifeBuoy, Mail, Menu, Shield, Star, Users
} from "lucide-react";
import Link from "next/link";

// SaaS门户页面组件
export default function SaaSPortalPage() {
    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            {/* 导航栏 */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-16 items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Globe className="h-8 w-8 text-blue-600" />
                        <span className="text-xl font-bold tracking-tight hidden sm:inline-block">
                            海纳百川
                        </span>
                    </div>

                    {/* 桌面导航 */}
                    <nav className="hidden md:flex items-center gap-6">
                        <Link href="#features" className="text-sm font-medium transition-colors hover:text-primary">功能</Link>
                        <Link href="#pricing" className="text-sm font-medium transition-colors hover:text-primary">定价</Link>
                        <Link href="#customers" className="text-sm font-medium transition-colors hover:text-primary">客户案例</Link>
                        <Link href="#docs" className="text-sm font-medium transition-colors hover:text-primary">文档</Link>
                    </nav>

                    <div className="flex items-center gap-3">
                        <Link href="/login">
                            <Button variant="ghost" size="sm">登录</Button>
                        </Link>
                        <Link href="/register">
                            <Button size="sm">免费试用</Button>
                        </Link>

                        {/* 移动端菜单按钮 */}
                        <Button variant="ghost" size="icon" className="md:hidden">
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">打开菜单</span>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="flex-1">
                {/* 英雄区域 */}
                <section className="py-16 md:py-24 lg:py-32">
                    <div className="container">
                        <div className="flex flex-col items-center text-center space-y-6 md:space-y-8">
                            <Badge variant="outline" className="mb-2">下一代云原生平台</Badge>
                            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
                                简化您的<span className="text-blue-600">云应用</span>管理
                            </h1>
                            <p className="max-w-2xl text-lg text-muted-foreground">
                                您可以用<span className="text-blue-400">极低的成本</span>轻松部署、管理和扩展容器应用，减少运维复杂性，提高开发效率。
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link href="/register">
                                    <Button size="lg" className="gap-2">
                                        开始免费试用
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                                <Link href="#demo">
                                    <Button size="lg" variant="secondary">观看演示</Button>
                                </Link>
                            </div>
                            <p className="text-xs text-muted-foreground">无需信用卡 · 最多90天免费试用 · 随时取消</p>
                        </div>
                    </div>
                </section>

                {/* 客户标志 */}
                <section className="py-12 bg-muted/50">
                    <div className="container">
                        <p className="text-center text-sm font-medium text-muted-foreground mb-8">值得信赖的企业客户</p>
                        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
                            {["Company A", "Company B", "Company C", "Company D"].map((company) => (
                                <div key={company} className="text-muted-foreground opacity-60 hover:opacity-100 transition-opacity">
                                    {company}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 功能特性 */}
                <section id="features" className="py-16 md:py-24">
                    <div className="container">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <Badge variant="outline" className="mb-4">强大功能</Badge>
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">专为现代开发团队打造</h2>
                            <p className="text-muted-foreground">
                                我们的平台集成了开发和运维所需的全部工具，让您的团队专注于创造价值
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[
                                { icon: <LayoutDashboard className="h-6 w-6" />, title: "直观仪表盘", description: "集中管理所有项目和资源，实时监控应用性能和状态" },
                                { icon: <Shield className="h-6 w-6" />, title: "高性价比", description: "以计算资源为单位按量付费，最低仅0.005元/小时" },
                                { icon: <Users className="h-6 w-6" />, title: "秒级启动", description: "仅需几秒钟的时间即可快速拉起您的应用" },
                                { icon: <CheckCircle2 className="h-6 w-6" />, title: "自动化部署", description: "一键部署应用程序，减少人为错误，加速发布流程" },
                                { icon: <Globe className="h-6 w-6" />, title: "全球节点支持", description: "通过分布全球的多个节点网络加速您的应用" },
                                { icon: <LifeBuoy className="h-6 w-6" />, title: "7*24服务", description: "我们的专家团队随时为您提供技术支持和问题解答" },
                            ].map((feature, index) => (
                                <Card key={index} className="hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-2">
                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-2">
                                            {feature.icon}
                                        </div>
                                        <CardTitle>{feature.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground">{feature.description}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 定价方案 */}
                <section id="pricing" className="py-16 md:py-24 bg-muted/50">
                    <div className="container">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <Badge variant="outline" className="mb-4">简单透明的定价</Badge>
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">选择适合您的方案</h2>
                            <p className="text-muted-foreground">
                                无论您是初创公司还是大型企业，我们都能满足您的需求
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                            {/* 入门方案 */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>入门版</CardTitle>
                                    <CardDescription>适合小型团队和个人使用</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-4xl font-bold">¥99<span className="text-base font-normal text-muted-foreground">/月</span></div>
                                    <ul className="mt-6 space-y-3">
                                        {["最多5个项目", "10GB存储空间", "基础分析功能", "社区支持"].map((item, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                                <span className="text-sm">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                                <CardFooter>
                                    <Button variant="secondary" className="w-full">选择方案</Button>
                                </CardFooter>
                            </Card>

                            {/* 专业方案 */}
                            <Card className="border-blue-500 shadow-lg relative">
                                <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1">最受欢迎</div>
                                <CardHeader>
                                    <CardTitle>专业版</CardTitle>
                                    <CardDescription>适合成长中的企业团队</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-4xl font-bold">¥299<span className="text-base font-normal text-muted-foreground">/月</span></div>
                                    <ul className="mt-6 space-y-3">
                                        {["无限项目", "100GB存储空间", "高级分析功能", "优先支持", "团队协作工具"].map((item, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                                <span className="text-sm">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                                <CardFooter>
                                    <Button className="w-full">选择方案</Button>
                                </CardFooter>
                            </Card>

                            {/* 企业方案 */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>企业版</CardTitle>
                                    <CardDescription>适合大型企业和机构</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-4xl font-bold">定制<span className="text-base font-normal text-muted-foreground">/月</span></div>
                                    <ul className="mt-6 space-y-3">
                                        {["无限项目", "自定义存储空间", "专属客户经理", "24/7技术支持", "高级安全功能"].map((item, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                                <span className="text-sm">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                                <CardFooter>
                                    <Button variant="secondary" className="w-full">联系销售</Button>
                                </CardFooter>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* 客户评价 */}
                <section id="customers" className="py-16 md:py-24">
                    <div className="container">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <Badge variant="outline" className="mb-4">客户评价</Badge>
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">用户如何评价我们</h2>
                            <p className="text-muted-foreground">
                                听听我们的客户分享他们使用Dokploy的体验和成果
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1, 2, 3].map((i) => (
                                <Card key={i}>
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center gap-1 text-yellow-500 mb-2">
                                            {[...Array(5)].map((_, j) => (
                                                <Star key={j} className="h-4 w-4 fill-current" />
                                            ))}
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="italic text-muted-foreground mb-4">
                                            "Dokploy极大地简化了我们的部署流程，团队效率提升了至少50%。界面直观易用，客服响应迅速，强烈推荐！"
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-muted"></div>
                                            <div>
                                                <div className="font-medium">客户名称 {i}</div>
                                                <div className="text-sm text-muted-foreground">职位，公司</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 行动召唤 */}
                <section className="py-16 md:py-24 bg-primary/5">
                    <div className="container max-w-4xl text-center">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">准备好开始您的云应用之旅了吗？</h2>
                        <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                            加入 thousands 已经在使用Dokploy的团队，体验更高效的云管理方式
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button size="lg">免费开始14天试用</Button>
                            <Button size="lg" variant="secondary">预约演示</Button>
                        </div>
                    </div>
                </section>
            </main>

            {/* 页脚 */}
            <footer className="bg-background border-t py-12 md:py-16">
                <div className="container">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Globe className="h-6 w-6 text-blue-600" />
                                <span className="font-bold text-lg">海纳百川</span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-4">
                                简化云基础设施管理，提升团队效率
                            </p>
                            <div className="flex gap-4">
                                {/* 社交媒体图标 */}
                                {["twitter", "github", "linkedin"].map((social) => (
                                    <Button key={social} variant="ghost" size="icon" className="h-8 w-8">
                                        <span className="sr-only">{social}</span>
                                        <div className="w-4 h-4 bg-muted rounded-full"></div>
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {[
                            { title: "产品", links: ["功能", "定价", "案例研究", "路线图"] },
                            { title: "资源", links: ["文档", "教程", "博客", "社区"] },
                            { title: "公司", links: ["关于我们", "联系我们", "招贤纳士", "法律条款"] },
                        ].map((column, i) => (
                            <div key={i}>
                                <h3 className="font-medium mb-4">{column.title}</h3>
                                <ul className="space-y-2">
                                    {column.links.map((link, j) => (
                                        <li key={j}>
                                            <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">{link}</a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <Separator className="my-8" />

                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Dokploy. 保留所有权利。</p>
                        <div className="flex gap-6">
                            {["隐私政策", "服务条款"].map((item) => (
                                <a key={item} href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">{item}</a>
                            ))}
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}