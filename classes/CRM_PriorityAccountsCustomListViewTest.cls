@isTest
public class CRM_PriorityAccountsCustomListViewTest {
    
@isTest
    public static void CRM_PriorityAccountsTest(){
       CRM_PriorityAccountsCustomListView.AccIdsAndDynamicQuery objChild = new CRM_PriorityAccountsCustomListView.AccIdsAndDynamicQuery();
           objChild = CRM_PriorityAccountsCustomListView.fetchAccIdsFrmEntrySubOb();
        CRM_PriorityAccountsCustomListView.getPrioritizedAccounts(90,objChild);
    }
}