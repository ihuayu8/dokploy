import {ProfileBalance} from "@/components/dashboard/settings/profile/profile-balance";
import {ProfileVoucher} from "@/components/dashboard/settings/profile/profile-voucher";
import {ProfileCoupon} from "@/components/dashboard/settings/profile/profile-coupon";
import type {ReactElement} from "react";
import {DashboardLayout} from "@/components/layouts/dashboard-layout";

const Page = () => {

    // const { data: isCloud } = api.settings.isCloud.useQuery();
    return (
        <div className="w-full">
            <div className="h-full rounded-xl  max-w-5xl mx-auto flex flex-col gap-4">
                <ProfileBalance />
                <ProfileVoucher />
                <ProfileCoupon />
            </div>
        </div>
    );
};

export default Page;

Page.getLayout = (page: ReactElement) => {
    return <DashboardLayout metaName="Profile">{page}</DashboardLayout>;
};