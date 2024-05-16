/**
 * @description - trigger helper for the building object.
 * @author - PWC            
 * @date - October 6, 2022
 */
public class CRM_PriorityAccountsCustomListView {
    
    static String userId = UserInfo.getUserId();
    static String accountObject = 'Account';
    static  String dynamicQueryString;
    static List<Id> accountIds;
    static List<CRM_PriorityAccounts_CustomListView__mdt> accountMdtList; 
    static String customerAccountRecTypeDevName = 'CRM_Customer_Account';
    
    /**
    * @methodName - getPrioritizedAccounts
    * @params -   offSetCount         
    * @return Type - AccountWrapper
    * @decription - This method used to build wrapper class it containt datatble column values and actual custom list view data , list view data prepared
    *               based on offset count and till infinate loop end from component level. 
    **/  
   @AuraEnabled(cacheable=true)
    public static List<Account> getPrioritizedAccounts(Integer offSetCount,Object objAccIdsAndString) {
        
        AccIdsAndDynamicQuery objAccIdsAndDQuery = (AccIdsAndDynamicQuery)JSON.deserialize(JSON.serialize(objAccIdsAndString), AccIdsAndDynamicQuery.class);
        dynamicQueryString = objAccIdsAndDQuery.dynamicQueryString ;
        accountIds = objAccIdsAndDQuery.accountIdsList;
        List<Account> loadMoreaccountsList = new List<Account>();

        try{
            
            Integer limitValue = 100;
            dynamicQueryString += '  FROM ACCOUNT WHERE Id In:accountIds Order By NAME ASC LIMIT:limitValue OFFSET:offSetCount ';           
            loadMoreaccountsList = Database.query(dynamicQueryString); 
           
        }catch(Exception ex){            
            CRM_ExceptionService.createExceptionLog( ex,'Apex','CRM_PriorityAccountsCustomListView','getPrioritizedAccounts');
            throw new AuraHandledException('Something went wrong, Please contact system adminstrator');
        } 
       return loadMoreaccountsList;
    }    


     /**
    * @methodName - prepareDymaicAccountTableColumns
    * @params -   No         
    * @return Type - void
    * @decription - This method used to initialize the verible and preparing the columns from metadata and build the dyanamic SQOL statement it runs once only when component load
    **/  
    private static String prepareDymaicAccountTableColumns(){
       
        dynamicQueryString = 'SELECT Id,';          
            accountMdtList = new List<CRM_PriorityAccounts_CustomListView__mdt>();
        
            for(CRM_PriorityAccounts_CustomListView__mdt objMdt :[SELECT Label,CRM_Field_API_Name__c,CRM_Is_Active__c 
                                                                  FROM CRM_PriorityAccounts_CustomListView__mdt 
                                                                  WHERE CRM_Is_Active__c = true Order By Label ASC]){
                if(string.isNotBlank(objMdt.CRM_Field_API_Name__c)){
                    
                    dynamicQueryString += objMdt.CRM_Field_API_Name__c +',';
                    accountMdtList.add(objMdt);                                                       
                }
            }
            dynamicQueryString = dynamicQueryString.removeEnd(',');
         return dynamicQueryString;
        }    
            
    /**
    * @methodName - getAccountIdList
    * @params -   No         
    * @return Type - List<Id>
    * @decription - This method used to build the accountIds from entry subscription object
    **/  
    private static List<Id> getAccountIdList(){

        accountIds = new List<Id>();       
        
        /** EntitySubscription required Limit 1000 to retrieve the data,  hence we added two SOQL query by considering one user can maxium subscribe 2000 Account records */
        List<EntitySubscription> subscriptionActList = [SELECT  ParentId,Parent.RecordType.DeveloperName FROM EntitySubscription  WHERE Parent.Type =: accountObject AND SubscriberId =:userId LIMIT 1000];
        
        if(subscriptionActList != null && subscriptionActList.size() > 999){
            subscriptionActList.addAll( [SELECT ParentId,Parent.RecordType.DeveloperName FROM EntitySubscription  WHERE Parent.Type =: accountObject AND SubscriberId =:userId  AND ID NOT IN: subscriptionActList LIMIT 1000 ]);
        }
        
        for(EntitySubscription objEntry : subscriptionActList){ 
           if(String.isNotBlank(objEntry.Parent.RecordTypeId) && String.isNotBlank(objEntry.Parent.RecordType.DeveloperName) && (objEntry.Parent.RecordType.DeveloperName == customerAccountRecTypeDevName )){
              
               		accountIds.add(objEntry.ParentId);
               
            }
        }
        
        return accountIds;
    }
    /**
    * @methodName - fetchAccIdsFrmEntrySubOb
    * @params -   No         
    * @return Type - AccIdsAndDynamicQuery
    * @decription - This method used to build the accountIds from entry subscription object
    **/  
    @AuraEnabled(cacheable=true)
    public static AccIdsAndDynamicQuery fetchAccIdsFrmEntrySubOb(){        
        
        AccIdsAndDynamicQuery objAccIds = new AccIdsAndDynamicQuery();
        objAccIds.accountIdsList = getAccountIdList();
        objAccIds.dynamicQueryString = prepareDymaicAccountTableColumns();
        objAccIds.accountMdtList = accountMdtList;
        
        return objAccIds;
    }    
    public class AccIdsAndDynamicQuery{
        @AuraEnabled public List<Id> accountIdsList;
        @AuraEnabled Public String dynamicQueryString;
        @AuraEnabled Public List<CRM_PriorityAccounts_CustomListView__mdt> accountMdtList;
    }
   
}