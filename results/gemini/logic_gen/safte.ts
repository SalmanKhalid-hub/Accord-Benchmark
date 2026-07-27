import { ITemplateModel, ITokenSale, ITokenShare } from './generated/org.accordproject.safte@0.2.0';
import { CurrencyCode } from './generated/org.accordproject.money@0.3.0';

// @ts-ignore
class SafteLogic extends TemplateLogic<ITemplateModel> {
    /**
     * The trigger function
     * @param data The clause data
     * @param request The request
     */
    async trigger(data: ITemplateModel, request: ITokenSale): Promise<{ result: ITokenShare }> {
        const discountRate = 1 - (data.discount / 100);
        const tokenAmount = data.purchaseAmount.doubleValue / (request.tokenPrice.doubleValue * discountRate);

        return {
            result: {
                $class: 'org.accordproject.safte@0.2.0.TokenShare',
                $timestamp: new Date(),
                tokenAmount: tokenAmount,
            },
        };
    }
}

export default SafteLogic;
